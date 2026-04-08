import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { Activity, Search, Server, Clock, User, Fingerprint, ShieldAlert, ArrowRight, Loader2, Calendar } from 'lucide-react';

export default function ActivityDashboard() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState('ALL');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/audit-logs', { params: { search, entityType: filter, limit: 100 } });
            setLogs(res.data.logs);
        } catch (error) {
            console.error('Failed to fetch logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [search, filter]);

    const getActionColor = (action) => {
        if (action.includes('CREATE') || action.includes('POST')) return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
        if (action.includes('UPDATE') || action.includes('PATCH') || action.includes('PUT')) return 'bg-amber-500/10 text-amber-600 border-amber-200';
        if (action.includes('DELETE') || action.includes('REJECT')) return 'bg-red-500/10 text-red-600 border-red-200';
        if (action.includes('APPROVE')) return 'bg-blue-500/10 text-blue-600 border-blue-200';
        return 'bg-slate-500/10 text-slate-600 border-slate-200';
    };

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
            {/* Header Area */}
            <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 flex justify-between items-end relative overflow-hidden">

                <div className="relative z-10 w-full">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <Activity className="text-indigo-600" size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500">System Trace</span>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end w-full gap-6">
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-800 mb-2">Audit Logs</h1>
                            <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                                <Server size={14} /> Tracking all backend mutations and state changes.
                            </p>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="relative flex-1 md:w-64">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search IP, Actor, ID..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 pl-11 pr-4 py-3 rounded-2xl text-sm font-bold focus:border-indigo-400 outline-none transition-all placeholder:text-slate-300"
                                />
                            </div>
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="bg-slate-50 border-2 border-slate-100 px-4 py-3 rounded-2xl text-sm font-bold focus:border-indigo-400 outline-none transition-all text-slate-600"
                            >
                                <option value="ALL">All Sources</option>
                                <option value="prs">PRs</option>
                                <option value="purchase-orders">POs</option>
                                <option value="auth">Auth</option>
                                <option value="master-data">Master Data</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl p-8 relative">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 text-indigo-400">
                        <Loader2 className="animate-spin mb-4" size={32} />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-300">Scanning Database...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center mx-auto mb-4 border border-slate-100">
                            <Server className="text-slate-300" size={24} />
                        </div>
                        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No activities detected</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {logs.map((log, idx) => (
                            <div key={log.id} className="flex gap-4 relative group">
                                {/* Vertical line connecting items */}
                                {idx !== logs.length - 1 && (
                                    <div className="absolute left-6 top-12 bottom-[-24px] w-0.5 bg-slate-100/80 rounded-full"></div>
                                )}

                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0 z-10 group-hover:scale-110 transition-transform shadow-sm">
                                    <Fingerprint className="text-indigo-400" size={20} />
                                </div>

                                <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 p-5 group-hover:border-indigo-200 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-2 py-1 rounded-md">
                                                    {log.entityType || 'SYSTEM'}
                                                </span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-800 flex items-center gap-2">
                                                <User size={14} className="text-slate-400" />
                                                Actor: <span className="text-indigo-600">{log.actor}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1 mb-1">
                                                <Calendar size={12} /> {new Date(log.createdAt).toLocaleDateString()}
                                            </p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-1">
                                                <Clock size={12} /> {new Date(log.createdAt).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>

                                    {(log.entityId || log.ipAddress) && (
                                        <div className="flex items-center gap-4 text-xs font-medium text-slate-500 mb-4 bg-white border border-slate-100 p-2.5 rounded-xl">
                                            {log.entityId && (
                                                <span className="flex items-center gap-1.5"><Server size={14} className="text-blue-400" /> ID: <span className="font-mono text-[10px]">{log.entityId}</span></span>
                                            )}
                                            {log.ipAddress && (
                                                <span className="flex items-center gap-1.5"><Server size={14} className="text-slate-300" /> IP: <span className="font-mono text-[10px]">{log.ipAddress}</span></span>
                                            )}
                                        </div>
                                    )}

                                    {log.details && (
                                        <div className="bg-slate-900 rounded-xl p-4 overflow-hidden border border-slate-800">
                                            <div className="flex items-center gap-2 mb-2 text-slate-500">
                                                <ArrowRight size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Payload Context</span>
                                            </div>
                                            <pre className="text-[10px] text-emerald-400 font-mono whitespace-pre-wrap leading-relaxed">
                                                {JSON.stringify(log.details, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
