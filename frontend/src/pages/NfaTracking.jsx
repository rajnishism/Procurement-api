import React, { useState, useEffect } from 'react';
import {
    Search, FileText, Clock, AlertCircle, Download, Calendar,
    Eye, X, Hash, DollarSign, ExternalLink, ClipboardList,
    CheckCircle2, XCircle, ChevronRight, FilePlus, RefreshCw,
    Building2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

// ─────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────
const STATUS_CFG = {
    DRAFT: { cls: 'bg-gray-50 text-gray-700 border-gray-100', label: 'Draft', icon: <Clock size={10} /> },
    SUBMITTED: { cls: 'bg-blue-50 text-blue-700 border-blue-100', label: 'Submitted', icon: <ChevronRight size={10} /> },
    APPROVED: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', label: 'Approved', icon: <CheckCircle2 size={10} /> },
    REJECTED: { cls: 'bg-red-50 text-red-700 border-red-100', label: 'Rejected', icon: <XCircle size={10} /> },
};

// ─────────────────────────────────────────────────
// NFA DETAIL DRAWER
// ─────────────────────────────────────────────────
const NfaDetailDrawer = ({ nfa, onClose, onNavigate }) => {
    if (!nfa) return null;

    const getStatusStyle = (s) => {
        switch (s) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
    const fmtMoney = (v) => v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full max-w-3xl bg-white shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white">
                    <div className="flex items-center space-x-4">
                        <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <FileText size={22} />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Note for Approval</p>
                            <h2 className="text-xl font-black text-gray-900">{nfa.nfaNumber}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(nfa.status)}`}>
                            {nfa.status}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">

                    {/* Key Details Grid */}
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Key Details</p>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { icon: Calendar, label: 'NFA Date', value: fmt(nfa.nfaDate) },
                                { icon: Hash, label: 'Indent No.', value: nfa.indentNo || '—' },
                                { icon: Hash, label: 'SAP PR No.', value: nfa.sapPrNo || '—' },
                                { icon: Hash, label: 'NTD Ref. No.', value: nfa.ntdRefNo || '—' },
                                { icon: DollarSign, label: 'Current NFA Value', value: fmtMoney(nfa.currentNFAValue) },
                                { icon: DollarSign, label: 'Previous NFA Value', value: fmtMoney(nfa.previousNFAValue) },
                                { icon: Calendar, label: 'Original Completion', value: fmt(nfa.originalCompletionDate) },
                                { icon: Calendar, label: 'Revised Completion', value: fmt(nfa.revisedCompletionDate) },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3.5 border border-transparent hover:border-gray-200 transition-colors">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Icon size={13} className="text-gray-400" />
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                    </div>
                                    <p className="text-sm font-bold text-gray-800 truncate">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Project & Description */}
                    {nfa.project && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Project</p>
                            <p className="text-sm text-gray-700 font-bold bg-gray-50 rounded-xl p-4">{nfa.project}</p>
                        </div>
                    )}

                    {nfa.itemDescription && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Item Description</p>
                            <p className="text-sm text-gray-600 font-medium bg-gray-50 rounded-xl p-4 leading-relaxed" style={{ whiteSpace: 'pre-line' }}>
                                {nfa.itemDescription}
                            </p>
                        </div>
                    )}

                    {/* Vendor */}
                    {nfa.recommendedVendor && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Recommended Vendor</p>
                            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
                                <Building2 size={18} className="text-indigo-500" />
                                <p className="text-sm font-bold text-indigo-800">{nfa.recommendedVendor}</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 italic">System ID: {nfa.id?.slice(0, 8)}</p>
                    <div className="flex items-center gap-2">
                        {nfa.documentPath && (
                            <a
                                href={`${api.defaults.baseURL}/uploads/${nfa.documentPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[10px] font-black px-4 py-2.5 rounded-xl transition-colors"
                            >
                                <ExternalLink size={12} />
                                View Document
                            </a>
                        )}
                        <button
                            onClick={() => { onClose(); onNavigate(nfa.id); }}
                            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-colors"
                        >
                            <ChevronRight size={12} />
                            Full Details
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

// ─────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────
const NfaTracking = () => {
    const navigate = useNavigate();
    const [nfas, setNfas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [selectedNfa, setSelectedNfa] = useState(null);

    useEffect(() => { fetchNfas(); }, []);

    const fetchNfas = async () => {
        setLoading(true);
        try {
            const res = await api.get('/nfas');
            setNfas(res.data);
        } catch (err) {
            console.error('Error fetching NFAs', err);
        } finally {
            setLoading(false);
        }
    };

    const filtered = nfas.filter(n => {
        const matchesSearch =
            n.nfaNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.project?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.itemDescription?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.indentNo?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || n.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const fmtMoney = (v) => v ? Number(v).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—';
    const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

    return (
        <>
            <NfaDetailDrawer nfa={selectedNfa} onClose={() => setSelectedNfa(null)} onNavigate={(id) => navigate(`/nfa/${id}`)} />

            <div className="space-y-6">
                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight">NFA Tracking</h2>
                        <p className="text-gray-500 font-medium">Complete archive of all Notes for Approval raised</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={fetchNfas}
                            className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 transition-all"
                        >
                            <RefreshCw size={16} />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={() => navigate('/nfas')}
                            className="flex items-center space-x-2 bg-gray-900 hover:bg-gray-800 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
                        >
                            <FilePlus size={16} />
                            <span>New NFA</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by NFA#, Project, Indent no., Description..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl">
                        {['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[100px]">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-12 border-r border-gray-200">#</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">NFA Number </th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">NFA Date</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">Item Description</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">Indent No.</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right border-r border-gray-200">NFA Value</th>
                                        <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32 border-r border-gray-200">Status</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((nfa, idx) => (
                                        <tr
                                            key={nfa.id}
                                            className="hover:bg-blue-50/30 transition-colors group cursor-default"
                                        >
                                            {/* # */}
                                            <td className="px-6 py-4 text-xs font-bold text-gray-400 text-center border-r border-gray-200">{idx + 1}</td>

                                            {/* NFA Number / Project */}
                                            <td
                                                className="px-4 py-4 min-w-[120px] border-r border-gray-200 cursor-pointer hover:bg-gray-50 transition-all group/cell"
                                                onClick={() => navigate(`/nfa/${nfa.id}`)}
                                            >
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-1 uppercase tracking-tight">
                                                            {nfa.nfaNumber}
                                                        </span>
                                                    </div>

                                                </div>
                                            </td>

                                            {/* Date */}
                                            <td className="px-4 py-4 border-r border-gray-200">
                                                <div className="flex items-center text-xs font-bold text-gray-600 whitespace-nowrap">
                                                    <Calendar size={13} className="mr-1.5 text-gray-400" />
                                                    {fmtDate(nfa.nfaDate)}
                                                </div>
                                            </td>

                                            {/* Item Description */}
                                            <td className="px-4 py-4 border-r border-gray-200 max-w-[320px]">
                                                <span className="text-xs font-medium text-gray-600 line-clamp-2 block">
                                                    {nfa.itemDescription || '—'}
                                                </span>
                                            </td>

                                            {/* Indent No. */}
                                            <td className="px-4 py-4 border-r border-gray-200">
                                                <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 whitespace-nowrap inline-block shadow-sm">
                                                    {nfa.indentNo || 'N/A'}
                                                </div>
                                            </td>

                                            {/* NFA Value */}
                                            <td className="px-4 py-4 text-right border-r border-gray-200">
                                                <div className="text-sm font-black text-gray-900 whitespace-nowrap">
                                                    {nfa.currentNFAValue ? `₹ ${fmtMoney(nfa.currentNFAValue)}` : '—'}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-4 text-center border-r border-gray-200">
                                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest inline-block w-24 ${getStatusStyle(nfa.status)}`}>
                                                    {nfa.status}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end ">

                                                    <button
                                                        onClick={() => navigate(`/nfa/${nfa.id}`)}
                                                        className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-xl transition-all"
                                                        title="Full Detail Page"
                                                    >
                                                        <ExternalLink size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan="8" className="py-20 text-center">
                                                <div className="flex flex-col items-center justify-center">
                                                    <ClipboardList size={48} className="text-gray-200 mb-4" />
                                                    <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">
                                                        {searchTerm || filterStatus !== 'ALL'
                                                            ? 'No records found matching filters'
                                                            : 'No NFAs created yet'}
                                                    </p>
                                                    {!searchTerm && filterStatus === 'ALL' && (
                                                        <button
                                                            onClick={() => navigate('/nfas')}
                                                            className="mt-4 text-xs font-black text-gray-900 underline underline-offset-2"
                                                        >
                                                            Create the first NFA →
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer count */}
                        {filtered.length > 0 && (
                            <div className="px-6 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                                <p className="text-[10px] font-bold text-gray-400">
                                    {filtered.length} record{filtered.length !== 1 ? 's' : ''} found
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default NfaTracking;
