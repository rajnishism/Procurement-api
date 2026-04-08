import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { DollarSign, AlertTriangle, TrendingUp, Briefcase, ChevronRight, Activity } from 'lucide-react';
import api from '../api/axios';

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/budgets/stats');
                setStats(res.data);
            } catch (err) {
                console.error('Error fetching stats', err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!stats) return <div>Failed to load dashboard data.</div>;

    const COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

    return (
        <div className="space-y-8 pb-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-4xl font-black text-gray-900 tracking-tight">Main Command</h2>
                    <p className="text-gray-500 font-medium">Enterprise Procurement Oversight • FY {new Date().getFullYear()}</p>
                </div>
                <div className="flex bg-white p-2 rounded-2xl border border-gray-100 shadow-sm items-center space-x-4">
                    <div className="px-4 py-2 bg-blue-50 rounded-xl">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest leading-none mb-1">Status</p>
                        <p className="text-xs font-bold text-blue-700">Live Financial Pulse</p>
                    </div>
                    <Activity className="text-blue-500 mr-2" size={20} />
                </div>
            </div>

            {/* Core Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-blue-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-600 rounded-2xl text-white">
                            <DollarSign size={24} />
                        </div>
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-tighter">Total Budget</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">${stats.summary.totalBudget.toLocaleString()}</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Annual Approved Capital</p>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-indigo-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                            <TrendingUp size={24} />
                        </div>
                        <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-tighter">Utilization</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">${stats.summary.totalSpent.toLocaleString()}</p>
                    <div className="mt-2 flex items-center">
                        <div className="flex-1 bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${stats.summary.utilizationRate}%` }}></div>
                        </div>
                        <span className="ml-3 text-xs font-black text-indigo-600">{Math.round(stats.summary.utilizationRate)}%</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-xl shadow-emerald-50/50">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-emerald-600 rounded-2xl text-white">
                            <Briefcase size={24} />
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">Remaining</span>
                    </div>
                    <p className="text-2xl font-black text-gray-900">${stats.summary.remaining.toLocaleString()}</p>
                    <p className="text-xs text-emerald-600 font-bold mt-1">Available Liquidity</p>
                </div>

                <div className={`p-6 rounded-[2rem] border shadow-xl ${stats.summary.overspentHeads > 0 ? 'bg-red-50 border-red-100 shadow-red-50/50' : 'bg-white border-gray-100 shadow-gray-50/50'}`}>
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-2xl text-white ${stats.summary.overspentHeads > 0 ? 'bg-red-600' : 'bg-gray-400'}`}>
                            <AlertTriangle size={24} />
                        </div>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter ${stats.summary.overspentHeads > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>High Risk</span>
                    </div>
                    <p className={`text-2xl font-black ${stats.summary.overspentHeads > 0 ? 'text-red-700' : 'text-gray-900'}`}>{stats.summary.overspentHeads} WBS</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">Budget Heads Overspent</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Trend Chart */}
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-800">Financial Execution Trend</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Monthly Budget vs Actual Spend</p>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                            <BarChart data={stats.monthlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#9ca3af' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    cursor={{ fill: '#f3f4f6', radius: 8 }}
                                />
                                <Bar dataKey="budget" fill="#d1d5db" radius={[6, 6, 0, 0]} name="Planned" barSize={30} />
                                <Bar dataKey="spend" fill="#3b82f6" radius={[6, 6, 0, 0]} name="Actual" barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Departmental Breakdown Card */}
                <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
                    <h3 className="text-xl font-black text-gray-800 mb-6">Departmental Hubs</h3>
                    <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {stats.departmentBreakdown.map((dept, i) => (
                            <div key={dept.name} className="flex flex-col">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center">
                                        <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                        <span className="text-sm font-black text-gray-700">{dept.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-gray-400">${dept.spend.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center">
                                    <div className="flex-1 bg-gray-50 h-2 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000"
                                            style={{
                                                width: `${dept.utilization}%`,
                                                backgroundColor: COLORS[i % COLORS.length]
                                            }}
                                        ></div>
                                    </div>
                                    <span className="ml-3 text-[10px] font-black text-gray-400">{Math.round(dept.utilization)}%</span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="mt-8 py-3 bg-gray-50 hover:bg-gray-100 rounded-2xl flex items-center justify-center text-xs font-black text-gray-500 uppercase tracking-widest transition-all">
                        Deep Drill View <ChevronRight size={14} className="ml-1" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
