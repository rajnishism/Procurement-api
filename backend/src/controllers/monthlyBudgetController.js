import prisma from '../utils/db.js';
import { wbsConfig } from '../config/wbsCodes.js';
import { syncAllBudgetHeads } from '../utils/wbsSync.js';

export const getBudgetSummary = async (req, res) => {
    try {
        const year = parseInt(req.query.year) || new Date().getFullYear();

        // 1. Sync Budget Heads from config to ensure database is current
        await syncAllBudgetHeads();

        // 2. Fetch all Planned Budgets for the assigned year
        const budgetEntries = await prisma.monthlyBudget.findMany({
            where: { year, subClassificationId: null },
            include: { budgetHead: { include: { department: true } } }
        });

        // 3. Fetch all active PRs (Expenses) for the assigned year
        const prs = await prisma.pr.findMany({
            where: {
                year,
                status: { not: 'REJECTED' },
                deletedAt: null
            },
            include: {
                department: true,
                allocations: true
            }
        });

        // --- Aggregation Logic ---

        let totalAnnualBudget = 0;
        let totalAnnualSpent = 0;
        
        // Month-wise aggregation
        const monthlyTrend = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(0, i).toLocaleString('default', { month: 'short' }),
            planned: 0,
            actual: 0
        }));

        // Department-wise aggregation
        const deptStatsMap = {};

        // A. Process Planned Budgets (Source: MonthlyBudget table)
        budgetEntries.forEach(b => {
            const amount = Number(b.amount);
            totalAnnualBudget += amount;
            
            if (b.month >= 1 && b.month <= 12) {
                monthlyTrend[b.month - 1].planned += amount;
            }
            
            const deptName = b.budgetHead?.department?.name || 'Unassigned';
            if (!deptStatsMap[deptName]) deptStatsMap[deptName] = { planned: 0, actual: 0 };
            deptStatsMap[deptName].planned += amount;
        });

        // B. Process Actual Expenses (Source: PR table)
        prs.forEach(pr => {
            const amount = Number(pr.totalValue);
            totalAnnualSpent += amount;
            
            if (pr.month >= 1 && pr.month <= 12) {
                monthlyTrend[pr.month - 1].actual += amount;
            }

            const deptName = pr.department?.name || 'Unassigned';
            if (!deptStatsMap[deptName]) deptStatsMap[deptName] = { planned: 0, actual: 0 };
            deptStatsMap[deptName].actual += amount;
        });

        // Format Department Breakdown
        const departmentBreakdown = Object.entries(deptStatsMap).map(([name, stats]) => ({
            name,
            planned: stats.planned,
            actual: stats.actual,
            utilization: stats.planned > 0 ? (stats.actual / stats.planned) * 100 : 0
        })).sort((a, b) => b.actual - a.actual);

        // Risk Analysis (Overspent Budget Heads)
        const overspentCount = budgetEntries.filter(b => {
            const headPlanned = Number(b.amount);
            const headActual = Number(b.allocated); // This was updated during PR creation/approval
            return headActual > headPlanned;
        }).length;

        res.json({
            summary: {
                totalBudget: totalAnnualBudget,
                totalSpent: totalAnnualSpent,
                remaining: totalAnnualBudget - totalAnnualSpent,
                utilizationRate: totalAnnualBudget > 0 ? (totalAnnualSpent / totalAnnualBudget) * 100 : 0,
                overspentHeads: overspentCount
            },
            monthlyTrend: monthlyTrend.map(m => ({
                name: m.name,
                budget: m.planned, // Mapping back to old key for frontend compatibility
                spend: m.actual
            })),
            departmentBreakdown: departmentBreakdown.map(d => ({
                name: d.name,
                budget: d.planned,
                spend: d.actual,
                utilization: d.utilization
            }))
        });
    } catch (error) {
        console.error('[Budget Summary] Critical failure:', error);
        res.status(500).json({ error: 'Failed to generate financial summary' });
    }
};

export const getMonthlyBudgets = async (req, res) => {
    try {
        const { year, month, budgetHeadId, departmentId } = req.query;

        const where = {};
        if (year) where.year = parseInt(year);
        if (month) where.month = parseInt(month);
        if (budgetHeadId) where.budgetHeadId = budgetHeadId;
        if (departmentId) {
            where.budgetHead = {
                departmentId: departmentId
            };
        }

        const budgets = await prisma.monthlyBudget.findMany({
            where,
            include: {
                budgetHead: {
                    include: { department: true }
                },
                subClassification: true
            }
        });

        // Enrich with real WBS codes from config
        const enriched = budgets.map(item => {
            if (!item.budgetHead) return item;

            // Find match in config
            let wbsCodes = [];
            for (const deptEntry of wbsConfig) {
                if (deptEntry.department === item.budgetHead.department?.name) {
                    const catEntry = deptEntry.categories.find(c => c.category === item.budgetHead.name);
                    if (catEntry) {
                        wbsCodes = catEntry.wbsCodes;
                        break;
                    }
                }
            }

            return {
                ...item,
                budgetHead: {
                    ...item.budgetHead,
                    // Inject the standard WBS code from config
                    code: wbsCodes.length > 0 ? wbsCodes.join(', ') : item.budgetHead.code
                }
            };
        });

        res.json(enriched);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const createOrUpdateMonthlyBudget = async (req, res) => {
    try {
        const { budgetHeadId, subClassificationId, month, year, amount } = req.body;

        // Check if exists
        const existing = await prisma.monthlyBudget.findFirst({
            where: {
                budgetHeadId,
                subClassificationId,
                month,
                year
            }
        });

        if (existing) {
            const updated = await prisma.monthlyBudget.update({
                where: { id: existing.id },
                data: {
                    amount,
                    remaining: Number(amount) - Number(existing.allocated)
                }
            });
            return res.json(updated);
        }

        const budget = await prisma.monthlyBudget.create({
            data: {
                budgetHeadId,
                subClassificationId,
                month,
                year,
                amount,
                remaining: amount,
                allocated: 0
            }
        });
        res.json(budget);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
export const getDashboardStats = async (req, res) => {
    try {
        const year = new Date().getFullYear();

        // 1. Get all base budgets (subClassificationId: null) for the year
        const budgets = await prisma.monthlyBudget.findMany({
            where: { year, subClassificationId: null },
            include: { budgetHead: { include: { department: true } } }
        });

        // 2. Summary stats
        let totalBudget = 0;
        let totalSpent = 0;
        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            name: new Date(0, i).toLocaleString('default', { month: 'short' }),
            budget: 0,
            spend: 0
        }));

        const deptStatsMap = {};

        budgets.forEach(b => {
            const amount = Number(b.amount);
            const spent = Number(b.allocated);
            totalBudget += amount;
            totalSpent += spent;

            // Monthly aggregation
            if (b.month >= 1 && b.month <= 12) {
                monthlyData[b.month - 1].budget += amount;
                monthlyData[b.month - 1].spend += spent;
            }

            // Department aggregation
            const deptName = b.budgetHead?.department?.name || 'Unknown';
            if (!deptStatsMap[deptName]) deptStatsMap[deptName] = { budget: 0, spend: 0 };
            deptStatsMap[deptName].budget += amount;
            deptStatsMap[deptName].spend += spent;
        });

        const deptStats = Object.entries(deptStatsMap).map(([name, stats]) => ({
            name,
            ...stats,
            utilization: stats.budget > 0 ? (stats.spend / stats.budget) * 100 : 0
        })).sort((a, b) => b.spend - a.spend);

        // 3. Count "At Risk" (Overspent) Budget Heads
        const overspentCount = await prisma.monthlyBudget.count({
            where: {
                year,
                subClassificationId: null,
                remaining: { lt: 0 }
            }
        });

        res.json({
            summary: {
                totalBudget,
                totalSpent,
                remaining: totalBudget - totalSpent,
                utilizationRate: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0,
                overspentHeads: overspentCount
            },
            monthlyTrend: monthlyData,
            departmentBreakdown: deptStats
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
