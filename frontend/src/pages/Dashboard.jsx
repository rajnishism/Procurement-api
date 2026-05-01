import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, AreaChart, Area, PieChart, Pie,
} from 'recharts';
import {
    DollarSign, TrendingUp, Briefcase, AlertTriangle, Activity,
    Package, FileText, ShieldCheck, Clock, BarChart3,
    Filter, Calendar, RefreshCw, Target,
} from 'lucide-react';
import api from '../api/axios';

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#10b981'];
const STATUS_COLORS = { Pending: '#f59e0b', Approved: '#10b981', Rejected: '#ef4444' };

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmt = (v) => {
    if (v == null) return '—';
    if (v >= 1_000_000) return `₹${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `₹${(v / 1_000).toFixed(1)}K`;
    return `₹${Number(v).toFixed(0)}`;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader = ({ icon: Icon, bgColor, title, subtitle }) => (
    <div className="flex items-center gap-3 mb-5">
        <div className={`p-2.5 rounded-xl text-white ${bgColor}`}>
            <Icon size={16} />
        </div>
        <div>
            <h3 className="text-lg font-black text-gray-900">{title}</h3>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{subtitle}</p>
        </div>
    </div>
);

const KpiCard = ({ icon: Icon, iconBg, badgeText, badgeColor, value, subText, alert }) => (
    <div className={`bg-white p-4 md:p-6 rounded-[2rem] shadow-xl ${alert ? 'ring-2 ring-red-300' : ''}`}>
        <div className="flex justify-between mb-4 items-center">
            <div className={`p-3 rounded-2xl text-white ${iconBg}`}>
                <Icon size={20} />
            </div>
            <span className={`text-xs font-black px-3 py-1 rounded-full ${badgeColor}`}>{badgeText}</span>
        </div>
        <p className={`text-2xl font-black ${alert ? 'text-red-700' : 'text-gray-900'}`}>{value}</p>
        {subText && <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{subText}</p>}
    </div>
);

const StatusBar = ({ label, count, total }) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    const labelStyle = { Pending: 'text-amber-600', Approved: 'text-emerald-600', Rejected: 'text-red-500' };
    return (
        <div>
            <div className="flex justify-between mb-1">
                <span className={`text-xs font-black ${labelStyle[label] || 'text-gray-600'}`}>{label}</span>
                <span className="text-xs font-black text-gray-500">{count}</span>
            </div>
            <div className="bg-gray-100 h-1.5 rounded-full overflow-hidden">
                <div
                    className="h-1.5 rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: STATUS_COLORS[label] }}
                />
            </div>
        </div>
    );
};

const MetricTile = ({ icon: Icon, label, value, bgColor, iconColor, textColor }) => (
    <div className={`flex items-center gap-3 p-3 rounded-xl ${bgColor}`}>
        <Icon size={16} className={iconColor} />
        <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest truncate">{label}</p>
            <p className={`text-sm font-black ${textColor}`}>{value}</p>
        </div>
    </div>
);

const EmptyChart = ({ icon: Icon, text }) => (
    <div className="h-full flex flex-col items-center justify-center gap-2">
        <Icon size={40} className="text-gray-200" />
        <p className="text-xs font-bold text-gray-300">{text}</p>
    </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
    const [data, setData] = useState(null);
    const [budgetTrend, setBudgetTrend] = useState([]);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState('ytd');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    const deptDebounce = useRef(null);

    const buildParams = useCallback(() => {
        const p = new URLSearchParams();
        if (range === '7d' || range === '30d') p.set('range', range);
        if (range === 'custom') {
            if (dateFrom) p.set('dateFrom', dateFrom);
            if (dateTo) p.set('dateTo', dateTo);
        }
        if (department.trim()) p.set('department', department.trim());
        if (status !== 'all') p.set('status', status);
        return p.toString();
    }, [range, department, status, dateFrom, dateTo]);

    const fetchData = useCallback(async () => {
        if (range === 'custom' && (!dateFrom || !dateTo)) return;
        setLoading(true);
        try {
            const [analyticsRes, budgetRes] = await Promise.all([
                api.get(`/analytics/dashboard?${buildParams()}`),
                api.get(`/budgets/summary`),
            ]);
            setData(analyticsRes.data);
            setBudgetTrend(budgetRes.data?.monthlyTrend ?? []);
        } catch (err) {
            console.error('[Dashboard] fetch error', err);
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [buildParams, range, dateFrom, dateTo]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleDeptChange = (val) => {
        setDepartment(val);
        clearTimeout(deptDebounce.current);
        deptDebounce.current = setTimeout(() => fetchData(), 700);
    };

    // ── Derived chart data ──────────────────────────────────────────────────

    const monthlyTrend = budgetTrend.map(m => ({
        name: m.name,
        Planned: +(m.budget / 1_000_000).toFixed(3),
        Actual: +(m.spend / 1_000_000).toFixed(3),
    }));

    const deptSpend = data?.finance?.breakdown?.departmentWiseSpend?.slice(0, 6) ?? [];
    const maxDeptAmt = deptSpend[0]?.amount || 1;

    const procStatusPieData = data
        ? [
            { name: 'Pending', value: data.procurement.overallStatus.pending, fill: '#f59e0b' },
            { name: 'Approved', value: data.procurement.overallStatus.approved, fill: '#10b981' },
            { name: 'Rejected', value: data.procurement.overallStatus.rejected, fill: '#ef4444' },
        ]
        : [];

    const dailyTrend = (() => {
        if (!data) return [];
        const prMap = {};
        const poMap = {};
        data.procurement.trends.dailyPRTrend.forEach(d => { prMap[d.date] = d.count; });
        data.procurement.trends.dailyPOTrend.forEach(d => { poMap[d.date] = d.count; });
        const all = [...new Set([
            ...data.procurement.trends.dailyPRTrend.map(d => d.date),
            ...data.procurement.trends.dailyPOTrend.map(d => d.date),
        ])].sort();
        return all.map(date => ({ date: date.slice(5), PR: prMap[date] || 0, PO: poMap[date] || 0 }));
    })();

    const deptPR = data?.procurement?.breakdown?.departmentWisePR?.slice(0, 6) ?? [];
    const maxDeptPR = deptPR[0]?.count || 1;

    // ── Loading & Error ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col justify-center items-center h-64 gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Loading Dashboard…</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="font-bold text-sm text-gray-500">Failed to load dashboard data.</p>
                <button
                    onClick={fetchData}
                    className="text-xs text-blue-600 font-black uppercase tracking-widest border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50 transition-all"
                >
                    Retry
                </button>
            </div>
        );
    }

    const { finance, procurement } = data;

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <div className="space-y-10 pb-12">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tight">Main Command</h2>
                    <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                        Enterprise Procurement Oversight · FY {new Date().getFullYear()}
                    </p>
                </div>
                <button
                    onClick={fetchData}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow text-xs font-black text-gray-600 uppercase tracking-widest transition-all active:scale-95 self-start"
                >
                    <RefreshCw size={13} />
                    Refresh
                </button>
            </div>

            {/* ── Filter Bar ── */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3 items-center">
                <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest mr-1">
                    <Filter size={12} />
                    Filters
                </div>

                {/* Range tabs */}
                <div className="flex bg-gray-50 rounded-xl p-1 gap-0.5">
                    {[['ytd', 'YTD'], ['30d', '30D'], ['7d', '7D'], ['custom', 'Custom']].map(([val, lbl]) => (
                        <button
                            key={val}
                            onClick={() => setRange(val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${range === val ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* Custom date range */}
                {range === 'custom' && (
                    <div className="flex items-center gap-2">
                        <Calendar size={13} className="text-gray-400" />
                        <input
                            type="date"
                            value={dateFrom}
                            onChange={e => setDateFrom(e.target.value)}
                            className="bg-gray-50 rounded-xl text-xs font-medium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border-none"
                        />
                        <span className="text-gray-300 text-xs font-bold">→</span>
                        <input
                            type="date"
                            value={dateTo}
                            onChange={e => setDateTo(e.target.value)}
                            className="bg-gray-50 rounded-xl text-xs font-medium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 border-none"
                        />
                    </div>
                )}

                {/* Department */}
                <input
                    type="text"
                    placeholder="Department…"
                    value={department}
                    onChange={e => handleDeptChange(e.target.value)}
                    className="bg-gray-50 rounded-xl text-xs font-medium px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 w-36 border-none"
                />

                {/* Status tabs */}
                <div className="flex bg-gray-50 rounded-xl p-1 gap-0.5">
                    {[['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']].map(([val, lbl]) => (
                        <button
                            key={val}
                            onClick={() => setStatus(val)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${status === val ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {lbl}
                        </button>
                    ))}
                </div>

                {/* Budget alert badge */}
                {finance.insights.budgetAlert && (
                    <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-xl text-xs font-black border border-red-100">
                        <AlertTriangle size={12} />
                        Budget Alert · {finance.summary.utilizationPercent}% used
                    </div>
                )}
            </div>

            {/* ════════════════════ FINANCE SECTION ════════════════════ */}
            <section>
                <SectionHeader
                    icon={DollarSign}
                    bgColor="bg-blue-600"
                    title="Finance Overview"
                    subtitle="Budget · Expenditure · Utilization"
                />

                {/* Finance KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <KpiCard
                        icon={DollarSign}
                        iconBg="bg-blue-600"
                        badgeText="Budget"
                        badgeColor="text-blue-600 bg-blue-50"
                        value={fmt(finance.summary.totalBudget)}
                        subText="Total Allocated"
                    />
                    <KpiCard
                        icon={TrendingUp}
                        iconBg="bg-indigo-600"
                        badgeText="Spent"
                        badgeColor="text-indigo-600 bg-indigo-50"
                        value={fmt(finance.summary.totalSpent)}
                        subText="Total Committed"
                    />
                    <KpiCard
                        icon={Briefcase}
                        iconBg="bg-emerald-600"
                        badgeText="Remaining"
                        badgeColor="text-emerald-600 bg-emerald-50"
                        value={fmt(finance.summary.remainingBudget)}
                        subText="Available Balance"
                    />
                    <KpiCard
                        icon={Activity}
                        iconBg={finance.insights.budgetAlert ? 'bg-red-600' : 'bg-amber-500'}
                        badgeText="Utilization"
                        badgeColor={finance.insights.budgetAlert ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'}
                        value={`${finance.summary.utilizationPercent}%`}
                        subText={finance.insights.budgetAlert ? '⚠ Budget Alert' : 'Burn Rate'}
                        alert={finance.insights.budgetAlert}
                    />
                </div>

                {/* Finance Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Monthly Spend Trend */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-base font-black text-gray-900 mb-0.5">Financial Execution Trend</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Budget vs Actual Spend ($M)</p>
                        <div className="h-64">
                            {monthlyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={monthlyTrend} barSize={14} barGap={4}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis tick={{ fontSize: 11, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700 }}
                                            formatter={(v, name) => [`₹${v.toFixed(2)}M`, name]}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                        <Bar dataKey="Planned" fill="#d1d5db" radius={[6, 6, 0, 0]} />
                                        <Bar dataKey="Actual" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyChart icon={BarChart3} text="No spend data for this period" />
                            )}
                        </div>
                    </div>

                    {/* Dept Spend Breakdown */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-base font-black text-gray-900 mb-0.5">Departmental Spend</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">
                            Top spender: <span className="text-blue-600">{finance.insights.highestSpendingDepartment || '—'}</span>
                        </p>
                        {deptSpend.length > 0 ? (
                            <div className="space-y-4">
                                {deptSpend.map((dept, i) => (
                                    <div key={dept.department}>
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-sm font-bold text-gray-700">{dept.department}</span>
                                            <span className="text-xs font-black text-gray-500">{fmt(dept.amount)}</span>
                                        </div>
                                        <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-2 rounded-full transition-all duration-700"
                                                style={{ width: `${(dept.amount / maxDeptAmt) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-48"><EmptyChart icon={Briefcase} text="No department data" /></div>
                        )}
                    </div>
                </div>
            </section>

            {/* ════════════════════ PROCUREMENT SECTION ════════════════════ */}
            <section>
                <SectionHeader
                    icon={Package}
                    bgColor="bg-indigo-600"
                    title="Procurement Overview"
                    subtitle="PR · PO · NFA Pipeline"
                />

                {/* Procurement KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">
                    <KpiCard
                        icon={FileText}
                        iconBg="bg-blue-600"
                        badgeText="PR"
                        badgeColor="text-blue-600 bg-blue-50"
                        value={procurement.totals.PR}
                        subText="Requisitions"
                    />
                    <KpiCard
                        icon={Package}
                        iconBg="bg-indigo-600"
                        badgeText="PO"
                        badgeColor="text-indigo-600 bg-indigo-50"
                        value={procurement.totals.PO}
                        subText="Purchase Orders"
                    />
                    <KpiCard
                        icon={ShieldCheck}
                        iconBg="bg-purple-600"
                        badgeText="NFA"
                        badgeColor="text-purple-600 bg-purple-50"
                        value={procurement.totals.NFA}
                        subText="Notes for Approval"
                    />
                    <KpiCard
                        icon={Target}
                        iconBg="bg-emerald-600"
                        badgeText="Conversion"
                        badgeColor="text-emerald-600 bg-emerald-50"
                        value={`${procurement.metrics.conversionRatePRtoPO}%`}
                        subText="PR → PO Rate"
                    />
                </div>

                {/* Status Breakdown Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    {[
                        { module: 'PR', badgeBg: 'bg-blue-50', badgeText: 'text-blue-600' },
                        { module: 'PO', badgeBg: 'bg-indigo-50', badgeText: 'text-indigo-600' },
                        { module: 'NFA', badgeBg: 'bg-purple-50', badgeText: 'text-purple-600' },
                    ].map(({ module, badgeBg, badgeText }) => {
                        const stats = procurement.statusBreakdown[module];
                        const total = procurement.totals[module];
                        return (
                            <div key={module} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-black text-gray-700">{module} Status</h4>
                                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${badgeBg} ${badgeText}`}>
                                        {total} Total
                                    </span>
                                </div>
                                <div className="space-y-3">
                                    <StatusBar label="Pending" count={stats.pending} total={total} />
                                    <StatusBar label="Approved" count={stats.approved} total={total} />
                                    <StatusBar label="Rejected" count={stats.rejected} total={total} />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Trends + Metrics Row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                    {/* Daily Trend Area Chart */}
                    <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-base font-black text-gray-900 mb-0.5">Daily Activity Trend</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">PRs & POs created per day</p>
                        <div className="h-56">
                            {dailyTrend.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={dailyTrend}>
                                        <defs>
                                            <linearGradient id="prGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.18} />
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id="poGrad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.18} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                        <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700 }} />
                                        <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                                        <Area type="monotone" dataKey="PR" stroke="#3b82f6" fill="url(#prGrad)" strokeWidth={2} dot={false} />
                                        <Area type="monotone" dataKey="PO" stroke="#6366f1" fill="url(#poGrad)" strokeWidth={2} dot={false} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <EmptyChart icon={Activity} text="No activity data for this period" />
                            )}
                        </div>
                    </div>

                    {/* Metrics Panel */}
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm flex flex-col gap-4">
                        <div>
                            <h3 className="text-base font-black text-gray-900 mb-0.5">Key Metrics</h3>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Efficiency Indicators</p>
                        </div>

                        <MetricTile
                            icon={Clock}
                            label="Avg PR Approval"
                            value={`${procurement.metrics.avgApprovalTime.PR} days`}
                            bgColor="bg-blue-50"
                            iconColor="text-blue-500"
                            textColor="text-blue-700"
                        />
                        <MetricTile
                            icon={Clock}
                            label="Avg PO Issuance"
                            value={`${procurement.metrics.avgApprovalTime.PO} days`}
                            bgColor="bg-indigo-50"
                            iconColor="text-indigo-500"
                            textColor="text-indigo-700"
                        />

                        <div className="h-px bg-gray-100" />

                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1.5">Bottleneck Stage</p>
                            <p className="text-sm font-black text-gray-800 leading-snug">{procurement.insights.bottleneckStage}</p>
                        </div>

                        <div className="bg-red-50 rounded-2xl p-4 border border-red-100">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Highest Pending</p>
                            <p className="text-3xl font-black text-gray-900">{procurement.insights.highestPendingModule}</p>
                            <p className="text-xs font-bold text-gray-400 mt-0.5">{procurement.overallStatus.pending} total pending</p>
                        </div>
                    </div>
                </div>

                {/* Pipeline Donut + Dept PR Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Overall Status Donut */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-base font-black text-gray-900 mb-0.5">Pipeline Status Distribution</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-4">Combined PR + PO + NFA</p>
                        <div className="flex items-center gap-6">
                            <div className="h-52 flex-1">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={procStatusPieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={52}
                                            outerRadius={78}
                                            paddingAngle={3}
                                            dataKey="value"
                                            strokeWidth={0}
                                        />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15)', fontSize: 12, fontWeight: 700 }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex flex-col gap-4">
                                {procStatusPieData.map(s => (
                                    <div key={s.name} className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                                        <div>
                                            <p className="text-xl font-black text-gray-900 leading-none">{s.value}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wide mt-0.5">{s.name}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Dept-wise PR count */}
                    <div className="bg-white p-6 md:p-8 rounded-[2.5rem] shadow-sm">
                        <h3 className="text-base font-black text-gray-900 mb-0.5">Department-wise PRs</h3>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-6">Requisition volume by dept</p>
                        {deptPR.length > 0 ? (
                            <div className="space-y-4">
                                {deptPR.map((dept, i) => (
                                    <div key={dept.department}>
                                        <div className="flex justify-between mb-1.5">
                                            <span className="text-sm font-bold text-gray-700">{dept.department}</span>
                                            <span className="text-xs font-black text-gray-500">{dept.count} PRs</span>
                                        </div>
                                        <div className="bg-gray-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="h-2 rounded-full transition-all duration-700"
                                                style={{ width: `${(dept.count / maxDeptPR) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-48"><EmptyChart icon={FileText} text="No department data" /></div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Dashboard;
