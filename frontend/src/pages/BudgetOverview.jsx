import React, { useState, useEffect } from 'react';
import { Search, Filter, PieChart, TrendingUp, Download, Calendar } from 'lucide-react';
import api from '../api/axios';
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

const BudgetOverview = () => {
    const [activeTab, setActiveTab] = useState('budget'); // 'budget' | 'expenses'
    const [budgets, setBudgets] = useState([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [departments, setDepartments] = useState([]);
    const [selectedDept, setSelectedDept] = useState('');
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [useMillions, setUseMillions] = useState(true);

    const formatValue = (val) => {
        if (useMillions) return (Number(val) / 1000000).toFixed(2) + 'M';
        return '$' + Number(val).toLocaleString();
    };

    useEffect(() => {
        fetchDepartments();
        fetchBudgets();
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [selectedDept, selectedYear, selectedMonth]);

    const fetchDepartments = async () => {
        try {
            const res = await api.get('/master-data/departments');
            setDepartments(res.data);
        } catch (error) {
            console.error('Failed to fetch departments', error);
        }
    };

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const params = {
                year: selectedYear,
                // Remove month from API call to fetch full year for YTD calculations
                departmentId: selectedDept || undefined
            };
            const res = await api.get('/budgets', { params });
            setBudgets(res.data);
        } catch (error) {
            console.error('Failed to fetch budgets', error);
        } finally {
            setLoading(false);
        }
    };

    // Aggregations
    // Use ONLY head-level records if they exist to avoid double-counting.
    // If NO head-level entries exist for a WBS, fallback to summing sub-classifications.
    const headLevelData = budgets.filter(i => !i.subClassificationId);
    const subLevelData = budgets.filter(i => i.subClassificationId);

    // Group budgets by WBS and Month to get distinct totals
    const processedBudgetHeads = Array.from(new Set(budgets.map(b => b.budgetHeadId)));

    // Each entry in wbsTotals is a normalized "representing Row" for that WBS and Month
    const wbsTotalEntries = processedBudgetHeads.map(headId => {
        // Find existing Head-level entry (where subClassificationId is null)
        const entriesByMonth = {};

        // 1. Look for explicit head budgets per month
        headLevelData.filter(h => h.budgetHeadId === headId).forEach(h => {
            entriesByMonth[h.month] = { month: h.month, amount: h.amount, allocated: h.allocated };
        });

        // 2. Supplement missing months by summing sub-classifications
        const monthsInSubs = Array.from(new Set(subLevelData.filter(s => s.budgetHeadId === headId).map(s => s.month)));
        monthsInSubs.forEach(m => {
            if (!entriesByMonth[m]) {
                const subs = subLevelData.filter(s => s.budgetHeadId === headId && s.month === m);
                entriesByMonth[m] = {
                    month: m,
                    amount: subs.reduce((sum, s) => sum + parseFloat(s.amount), 0),
                    allocated: subs.reduce((sum, s) => sum + parseFloat(s.allocated), 0)
                };
            }
        });

        return Object.values(entriesByMonth);
    }).flat();

    // 1. Current selection totals (filtered by month if it exists)
    const selectionData = wbsTotalEntries.filter(i => selectedMonth ? i.month === parseInt(selectedMonth) : true);
    const totalBudget = selectionData.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalExpense = selectionData.reduce((acc, curr) => acc + parseFloat(curr.allocated), 0);
    const totalRemaining = totalBudget - totalExpense;

    // 2. YTD Totals (Cumulative up to selected month or full year)
    const ytdLimit = selectedMonth ? parseInt(selectedMonth) : 12;
    const ytdData = wbsTotalEntries.filter(i => i.month <= ytdLimit);
    const ytdBudget = ytdData.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const ytdExpense = ytdData.reduce((acc, curr) => acc + parseFloat(curr.allocated), 0);
    const ytdRemaining = ytdBudget - ytdExpense;

    const [expandedRows, setExpandedRows] = useState({});

    // --- Grouping Logic to show each WBS only ONCE with expandable children ---
    const groupedData = budgets.reduce((acc, item) => {
        const headKey = item.budgetHeadId;
        const monthNum = item.month;

        if (!acc[headKey]) {
            acc[headKey] = {
                id: headKey,
                name: item.budgetHead?.name,
                code: item.budgetHead?.code,
                monthAmount: 0,
                monthSpent: 0,
                ytdPlanned: 0,
                ytdSpent: 0,
                childrenByMonth: {} // Grouped by Month: { 1: [entries], 2: [entries] }
            };
        }

        if (!acc[headKey].childrenByMonth[monthNum]) {
            acc[headKey].childrenByMonth[monthNum] = [];
        }

        // Add this specific entry (Sub-classification or direct head) to the month group
        acc[headKey].childrenByMonth[monthNum].push({
            name: item.subClassification?.name || 'General Head Expense',
            amount: parseFloat(item.amount),
            spent: parseFloat(item.allocated),
            year: item.year
        });

        const isYTD = item.month <= ytdLimit;
        const isCurrentMonth = selectedMonth ? item.month === parseInt(selectedMonth) : true;

        // Update Parent Totals (Sum for the WBS Code)
        if (isYTD) {

            acc[headKey].ytdPlanned += parseFloat(item.amount);
            acc[headKey].ytdSpent += parseFloat(item.allocated);
        }
        if (isCurrentMonth) {
            acc[headKey].monthAmount += parseFloat(item.amount);
            acc[headKey].monthSpent += parseFloat(item.allocated);
        }

        return acc;
    }, {});

    const filteredData = Object.values(groupedData).filter(item => {
        const term = searchTerm.toLowerCase();
        return (
            item.name?.toLowerCase().includes(term) ||
            item.code?.toLowerCase().includes(term) ||
            Object.values(item.childrenByMonth).some(monthEntries =>
                monthEntries.some(e => e.name.toLowerCase().includes(term))
            )
        );
    });

    const toggleRow = (id) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Helper to calculate YTD for a specific item in the table
    const calculateYTD = (budgetHeadId, subClassificationId = null) => {
        const limit = selectedMonth ? parseInt(selectedMonth) : 12;
        return budgets.filter(b =>
            b.budgetHeadId === budgetHeadId &&
            b.subClassificationId === subClassificationId &&
            b.month <= limit
        ).reduce((acc, curr) => ({
            planned: acc.planned + parseFloat(curr.amount),
            spent: acc.spent + parseFloat(curr.allocated)
        }), { planned: 0, spent: 0 });
    };

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center">
                        <TrendingUp className="mr-3 text-blue-600" size={32} />
                        {selectedDept ? `${departments.find(d => d.id === selectedDept)?.name} - ` : ''}Budget Oversight
                    </h2>
                    <p className="text-gray-500 mt-1 font-medium flex items-center">
                        Monitoring <span className="mx-1.5 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-tighter">{Object.keys(groupedData).length} WBS Codes</span> for the selected period
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Dept</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none min-w-[140px]"
                            value={selectedDept}
                            onChange={(e) => setSelectedDept(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Year</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(Number(e.target.value))}
                        >
                            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-1">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-2">Month</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            <option value="">All Months</option>
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'short' })}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={() => setUseMillions(!useMillions)}
                        className={`flex items-center px-4 py-1.5 rounded-xl text-xs font-black transition-all border ${useMillions
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                    >
                        {useMillions ? 'MODE: MILLIONS' : 'MODE: STANDARD'}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
                <button
                    onClick={() => setActiveTab('budget')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'budget'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Budget Overview
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'expenses'
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                        }`}
                >
                    Expense Tracking
                </button>
            </div>

            {/* Summary Cards */}
            <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-600 p-5 rounded-2xl text-white shadow-lg shadow-blue-100">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-bold uppercase tracking-wider opacity-80">Monthly Budget ({selectedMonth ? new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' }) : 'All'})</p>
                            <TrendingUp size={18} className="opacity-60" />
                        </div>
                        <p className="text-3xl font-black">{formatValue(totalBudget)}</p>
                    </div>
                    <div className="bg-indigo-600 p-5 rounded-2xl text-white shadow-lg shadow-indigo-100">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">Monthly Spent</p>
                        <p className="text-3xl font-black">{formatValue(totalExpense)}</p>
                    </div>
                    <div className="bg-emerald-600 p-5 rounded-2xl text-white shadow-lg shadow-emerald-100">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">Monthly Remaining</p>
                        <p className="text-3xl font-black">{formatValue(totalRemaining)}</p>
                    </div>
                </div>


                <div className="bg-gray-50 border border-gray-200 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                            <PieChart className="text-gray-500" size={20} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cumulative Oversight</p>
                            <p className="text-lg font-bold text-gray-800 italic">Total Summary till {selectedMonth ? new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'long' }) : 'End of Year'}</p>
                        </div>
                    </div>

                    <div className="flex space-x-8">
                        <div>
                            <p className="text-[10px] text-gray-400 font-bold uppercase">Budget Till Now</p>
                            <p className="text-xl font-black text-gray-900">{formatValue(ytdBudget)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-red-400 font-bold uppercase">Expenses Till Now</p>
                            <p className="text-xl font-black text-gray-900">{formatValue(ytdExpense)}</p>
                        </div>
                        <div className="pr-4">
                            <p className="text-[10px] text-emerald-500 font-bold uppercase">Net Remaining</p>
                            <p className="text-xl font-black text-gray-900">{formatValue(ytdRemaining)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">
                        {activeTab === 'budget' ? 'Budget Allocation Details' : 'Expense Report Details'}
                    </h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search heads..."
                            className="pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 w-64"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 font-bold text-gray-700">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs uppercase tracking-wider">WBS / Budget Head</th>
                                {activeTab === 'budget' && (
                                    <>
                                        <th className="px-6 py-4 text-right text-xs uppercase tracking-wider bg-blue-50">Planned ({selectedMonth ? new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' }) : 'Year'})</th>
                                        <th className="px-6 py-4 text-right text-xs uppercase tracking-wider bg-blue-100 text-blue-900">Total Planned till Now</th>
                                    </>
                                )}
                                {activeTab === 'expenses' && (
                                    <>
                                        <th className="px-6 py-4 text-right text-xs uppercase tracking-wider bg-orange-50 font-bold">Spent ({selectedMonth ? new Date(0, selectedMonth - 1).toLocaleString('default', { month: 'short' }) : 'Year'})</th>
                                        <th className="px-6 py-4 text-right text-xs uppercase tracking-wider bg-orange-100 text-orange-900 font-bold">Total Spent till Now</th>
                                        <th className="px-6 py-4 text-right text-xs uppercase tracking-wider bg-green-50">Balance Remaining</th>
                                        <th className="px-6 py-4 text-center text-xs uppercase tracking-wider">Status</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.length > 0 ? (
                                filteredData.map((item) => {
                                    const percent = item.ytdPlanned > 0 ? (item.ytdSpent / item.ytdPlanned) * 100 : 0;
                                    const isExpanded = expandedRows[item.id];

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                onClick={() => toggleRow(item.id)}
                                                className={`cursor-pointer transition-colors ${isExpanded ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className={`mr-2 transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                                                            <TrendingUp size={14} className="text-gray-400" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900">{item.name || 'N/A'}</div>
                                                            <div className="text-[10px] text-gray-400 font-mono font-bold tracking-tighter uppercase">{item.code}</div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {activeTab === 'budget' && (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-gray-700 bg-blue-50/10">
                                                            {formatValue(item.monthAmount)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-blue-700 bg-blue-100/10">
                                                            {formatValue(item.ytdPlanned)}
                                                        </td>
                                                    </>
                                                )}
                                                {activeTab === 'expenses' && (
                                                    <>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-orange-600 bg-orange-50/10">
                                                            {formatValue(item.monthSpent)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-orange-800 bg-orange-100/10">
                                                            {formatValue(item.ytdSpent)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-black text-emerald-700 bg-emerald-50/10">
                                                            {formatValue(item.ytdPlanned - item.ytdSpent)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${percent > 90 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                                {percent.toFixed(0)}%
                                                            </span>
                                                        </td>
                                                    </>
                                                )}
                                            </tr>

                                            {/* Sub-Classification Details (Expanded by Month Headers) */}
                                            {isExpanded && Object.entries(item.childrenByMonth)
                                                .sort((a, b) => parseInt(a[0]) - parseInt(b[0])) // Sort by month number
                                                .map(([monthNum, entries]) => {
                                                    const monthStr = new Date(0, parseInt(monthNum) - 1).toLocaleString('default', { month: 'long' });

                                                    return (
                                                        <React.Fragment key={`${item.id}-month-${monthNum}`}>
                                                            {/* Month Header Row */}
                                                            <tr className="bg-blue-50/50 border-l-4 border-blue-600">
                                                                <td colSpan={10} className="px-6 py-2">
                                                                    <div className="flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-blue-700">
                                                                        <Calendar size={12} className="mr-2" />
                                                                        {monthStr} {entries[0]?.year}
                                                                    </div>
                                                                </td>
                                                            </tr>

                                                            {/* Actual Entries for this Month */}
                                                            {entries.map((entry, idx) => (
                                                                <tr key={`${item.id}-${monthNum}-entry-${idx}`} className="bg-white border-l-4 border-gray-200">
                                                                    <td className="px-6 py-3 pl-12 whitespace-nowrap border-r border-gray-50/50">
                                                                        <div className="flex items-center text-xs text-gray-600 font-bold">
                                                                            <span className="mr-3 text-gray-300">↳</span> {entry.name}
                                                                        </div>
                                                                    </td>
                                                                    {activeTab === 'budget' && (
                                                                        <>
                                                                            <td className="px-6 py-3 text-right text-xs text-gray-500 font-mono font-bold bg-blue-50/10">
                                                                                {formatValue(entry.amount)}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right text-xs text-blue-300 italic font-mono">
                                                                                Planned
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                    {activeTab === 'expenses' && (
                                                                        <>
                                                                            <td className="px-6 py-3 text-right text-xs text-orange-600 font-mono font-bold bg-orange-50/10">
                                                                                {formatValue(entry.spent)}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right text-xs text-gray-400 font-mono">
                                                                                -
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right text-xs text-blue-300 font-mono">
                                                                                -
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center text-[10px] text-gray-400 font-bold uppercase">
                                                                                Expense
                                                                            </td>
                                                                        </>
                                                                    )}
                                                                </tr>
                                                            ))}
                                                        </React.Fragment>
                                                    );
                                                })}
                                        </React.Fragment>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={10} className="px-6 py-16 text-center text-gray-400 italic">
                                        No data found for the selected filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default BudgetOverview;
