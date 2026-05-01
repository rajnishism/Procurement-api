import prisma from '../utils/db.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDateRange(range, dateFrom, dateTo) {
  if (dateFrom || dateTo) {
    const filter = {};
    if (dateFrom) filter.gte = new Date(dateFrom);
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      filter.lte = d;
    }
    return filter;
  }
  if (range === '7d') return { gte: new Date(Date.now() - 7 * 86_400_000) };
  if (range === '30d') return { gte: new Date(Date.now() - 30 * 86_400_000) };
  // default: current calendar year
  const year = new Date().getFullYear();
  return {
    gte: new Date(`${year}-01-01T00:00:00.000Z`),
    lte: new Date(`${year}-12-31T23:59:59.999Z`),
  };
}

function buildDeptFilter(department) {
  if (!department || department === 'all') return undefined;
  return {
    OR: [
      { name: { contains: department, mode: 'insensitive' } },
      { code: { contains: department, mode: 'insensitive' } },
    ],
  };
}

function mapPOStatus(status) {
  const approvedStatuses = ['ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_DELIVERED', 'DELIVERED', 'CLOSED'];
  const rejectedStatuses = ['CANCELLED'];
  if (approvedStatuses.includes(status)) return 'approved';
  if (rejectedStatuses.includes(status)) return 'rejected';
  return 'pending'; // DRAFT, PENDING_APPROVAL
}

function mapNFAStatus(status) {
  if (status === 'APPROVED') return 'approved';
  if (status === 'REJECTED') return 'rejected';
  return 'pending'; // DRAFT, SUBMITTED
}

function daysDiff(d1, d2) {
  return Math.abs((new Date(d2) - new Date(d1)) / 86_400_000);
}

function formatBottleneckRole(role) {
  // INDENTOR → Indentor, STAGE1 → Stage 1, etc.
  if (!role) return 'None';
  return role.replace(/^STAGE(\d+)$/, 'Stage $1').replace(/^(\w)(\w+)$/, (_, a, b) => a + b.toLowerCase());
}

// ─── Core Logic (shared between individual and combined endpoints) ─────────────

async function computeFinanceSummary(query) {
  const { range, department, status, dateFrom, dateTo } = query;
  const dateFilter = parseDateRange(range, dateFrom, dateTo);
  const deptFilter = buildDeptFilter(department);

  // Derive year from the date range start for budget lookup
  const rangeStart = dateFilter.gte || new Date();
  const year = rangeStart.getFullYear();

  // PR where clause
  const prWhere = {
    deletedAt: null,
    prDate: dateFilter,
  };
  if (status && status !== 'all') {
    prWhere.status = status.toUpperCase();
  } else {
    prWhere.status = { not: 'REJECTED' };
  }
  if (deptFilter) prWhere.department = deptFilter;

  // Budget where clause
  const budgetWhere = { year, subClassificationId: null };
  if (deptFilter) {
    budgetWhere.budgetHead = { department: deptFilter };
  }

  // Run queries in parallel
  const [budgets, prs] = await Promise.all([
    prisma.monthlyBudget.findMany({
      where: budgetWhere,
      select: { amount: true },
    }),
    prisma.pr.findMany({
      where: prWhere,
      select: {
        totalValue: true,
        month: true,
        department: { select: { name: true } },
      },
    }),
  ]);

  const totalBudget = budgets.reduce((s, b) => s + Number(b.amount), 0);

  let totalSpent = 0;
  const deptMap = {};
  const monthlyMap = {};
  const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  prs.forEach(pr => {
    const amount = Number(pr.totalValue);
    totalSpent += amount;

    const deptName = pr.department?.name || 'Unassigned';
    deptMap[deptName] = (deptMap[deptName] || 0) + amount;

    if (pr.month >= 1 && pr.month <= 12) {
      const monthKey = MONTH_NAMES[pr.month - 1];
      monthlyMap[monthKey] = (monthlyMap[monthKey] || 0) + amount;
    }
  });

  const departmentWiseSpend = Object.entries(deptMap)
    .map(([department, amount]) => ({ department, amount }))
    .sort((a, b) => b.amount - a.amount);

  const monthlySpendTrend = MONTH_NAMES
    .filter(m => monthlyMap[m] !== undefined)
    .map(month => ({ month, amount: monthlyMap[month] }));

  const utilizationPercent = totalBudget > 0
    ? +((totalSpent / totalBudget) * 100).toFixed(2)
    : 0;

  return {
    summary: {
      totalBudget,
      totalSpent,
      remainingBudget: totalBudget - totalSpent,
      utilizationPercent,
    },
    breakdown: {
      departmentWiseSpend,
      monthlySpendTrend,
    },
    insights: {
      highestSpendingDepartment: departmentWiseSpend[0]?.department || null,
      budgetAlert: utilizationPercent >= 90,
    },
  };
}

async function computeProcurementSummary(query) {
  const { range, department, dateFrom, dateTo } = query;
  const dateFilter = parseDateRange(range, dateFrom, dateTo);
  const deptFilter = buildDeptFilter(department);

  const prWhere = {
    deletedAt: null,
    prDate: dateFilter,
    ...(deptFilter ? { department: deptFilter } : {}),
  };

  // Run PR, PO, NFA, and pending approval queries in parallel
  const [prs, pos, nfas, pendingPRApprovals] = await Promise.all([
    prisma.pr.findMany({
      where: prWhere,
      select: {
        status: true,
        prDate: true,
        dateOfApproval: true,
        department: { select: { name: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      where: { createdAt: dateFilter },
      select: { status: true, createdAt: true, issuedAt: true },
    }),
    prisma.nfa.findMany({
      where: { createdAt: dateFilter },
      select: { status: true },
    }),
    prisma.prApproval.groupBy({
      by: ['role'],
      where: { status: 'PENDING' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
  ]);

  // ── PR aggregation ──
  const prStatusCount = { pending: 0, approved: 0, rejected: 0 };
  const deptPRMap = {};
  let totalPRApprovalDays = 0;
  let prApprovalCount = 0;
  const dailyPRMap = {};

  prs.forEach(pr => {
    prStatusCount[pr.status.toLowerCase()]++;

    const deptName = pr.department?.name || 'Unassigned';
    deptPRMap[deptName] = (deptPRMap[deptName] || 0) + 1;

    if (pr.dateOfApproval && pr.prDate) {
      totalPRApprovalDays += daysDiff(pr.prDate, pr.dateOfApproval);
      prApprovalCount++;
    }

    const day = pr.prDate.toISOString().split('T')[0];
    dailyPRMap[day] = (dailyPRMap[day] || 0) + 1;
  });

  // ── PO aggregation ──
  const poStatusCount = { pending: 0, approved: 0, rejected: 0 };
  let totalPOApprovalDays = 0;
  let poApprovalCount = 0;
  const dailyPOMap = {};

  pos.forEach(po => {
    poStatusCount[mapPOStatus(po.status)]++;

    if (po.issuedAt && po.createdAt) {
      totalPOApprovalDays += daysDiff(po.createdAt, po.issuedAt);
      poApprovalCount++;
    }

    const day = po.createdAt.toISOString().split('T')[0];
    dailyPOMap[day] = (dailyPOMap[day] || 0) + 1;
  });

  // ── NFA aggregation ──
  const nfaStatusCount = { pending: 0, approved: 0, rejected: 0 };
  nfas.forEach(nfa => { nfaStatusCount[mapNFAStatus(nfa.status)]++; });

  // ── Trends ──
  const sortEntries = map =>
    Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

  // ── Bottleneck ──
  const bottleneckStage = pendingPRApprovals[0]
    ? `PR ${formatBottleneckRole(pendingPRApprovals[0].role)} Approval`
    : 'None';

  const pendingCounts = {
    PR: prStatusCount.pending,
    PO: poStatusCount.pending,
    NFA: nfaStatusCount.pending,
  };
  const highestPendingModule = Object.entries(pendingCounts)
    .sort(([, a], [, b]) => b - a)[0][0];

  const conversionRatePRtoPO = prs.length > 0
    ? +((pos.length / prs.length) * 100).toFixed(1)
    : 0;

  return {
    totals: { PR: prs.length, PO: pos.length, NFA: nfas.length },
    statusBreakdown: {
      PR: prStatusCount,
      PO: poStatusCount,
      NFA: nfaStatusCount,
    },
    overallStatus: {
      pending: prStatusCount.pending + poStatusCount.pending + nfaStatusCount.pending,
      approved: prStatusCount.approved + poStatusCount.approved + nfaStatusCount.approved,
      rejected: prStatusCount.rejected + poStatusCount.rejected + nfaStatusCount.rejected,
    },
    metrics: {
      conversionRatePRtoPO,
      avgApprovalTime: {
        PR: prApprovalCount > 0 ? +(totalPRApprovalDays / prApprovalCount).toFixed(1) : 0,
        PO: poApprovalCount > 0 ? +(totalPOApprovalDays / poApprovalCount).toFixed(1) : 0,
        NFA: 0, // NFA approval timestamp not tracked in schema
      },
    },
    trends: {
      dailyPRTrend: sortEntries(dailyPRMap),
      dailyPOTrend: sortEntries(dailyPOMap),
    },
    breakdown: {
      departmentWisePR: Object.entries(deptPRMap)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count),
    },
    insights: {
      bottleneckStage,
      highestPendingModule,
    },
  };
}

// ─── Route Handlers ───────────────────────────────────────────────────────────

export const getFinanceSummary = async (req, res) => {
  try {
    const data = await computeFinanceSummary(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Analytics] Finance summary error:', err);
    res.status(500).json({ error: 'Failed to generate finance summary' });
  }
};

export const getProcurementSummary = async (req, res) => {
  try {
    const data = await computeProcurementSummary(req.query);
    res.json(data);
  } catch (err) {
    console.error('[Analytics] Procurement summary error:', err);
    res.status(500).json({ error: 'Failed to generate procurement summary' });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const [finance, procurement] = await Promise.all([
      computeFinanceSummary(req.query),
      computeProcurementSummary(req.query),
    ]);
    res.json({ finance, procurement });
  } catch (err) {
    console.error('[Analytics] Dashboard error:', err);
    res.status(500).json({ error: 'Failed to generate dashboard' });
  }
};
