import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText,
    Calendar,
    Hash,
    ArrowLeft,
    Download,
    CheckCircle2,
    Clock3,
    XCircle,
    AlertCircle,
    Check,
    X,
    Activity,
    Layers,
    ExternalLink,
    Briefcase,
    BarChart2,
    IndentIncrease,
    Code2,
    Banknote,
    TrendingDown,
    Target,
    Scale,
    Eye,
    Loader2,
} from 'lucide-react';
import api from '../api/axios';

const fmt = (n) =>
    n != null
        ? Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : '—';

const NfaDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [nfa, setNfa] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // ── Preview modal ─────────────────────────────────────────────────────────
    const [previewOpen,   setPreviewOpen]   = useState(false);
    const [previewUrl,    setPreviewUrl]    = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);

    const openPreview = async () => {
        if (!nfa?.documentPath) return;
        setPreviewLoading(true);
        try {
            const url = `${api.defaults.baseURL}/nfas/${id}/preview-pdf`;
            setPreviewUrl(url);
            setPreviewOpen(true);
        } finally {
            setPreviewLoading(false);
        }
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewUrl(null);
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/nfas/${id}`);
                setNfa(data);
            } catch (err) {
                console.error(err);
                setError('Failed to load NFA details');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const getDocumentUrl = (relPath) => {
        if (!relPath) return null;
        return `${api.defaults.baseURL}/uploads/${relPath}`;
    };

    const getStatusStyle = (s) => {
        switch (s) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'SUBMITTED': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
            case 'DRAFT': return 'bg-amber-50 text-amber-700 border-amber-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    /* ── Loading ── */
    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
                <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest animate-pulse">
                    Retrieving NFA Data…
                </p>
            </div>
        );
    }

    /* ── Error ── */
    if (error || !nfa) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6 text-center">
                <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-gray-800 mb-2">{error || 'NFA Not Found'}</h2>
                    <p className="text-gray-500 font-medium mb-8">
                        The Note for Approval you are looking for does not exist or you do not have permission to
                        view it.
                    </p>
                    <button
                        onClick={() => navigate('/nfahistory')}
                        className="bg-gray-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-gray-900 transition-all shadow-xl shadow-gray-200"
                    >
                        Return to NFA History
                    </button>
                </div>
            </div>
        );
    }

    const wbsNumbers = Array.isArray(nfa.wbsNumber) ? nfa.wbsNumber : [];

    return (
        <>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

            {/* ── Navigation Header ── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/nfahistory')}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-all group"
                >
                    <div className="p-2 bg-white border border-gray-100 rounded-xl group-hover:border-gray-300 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-sm font-black text-inherit uppercase tracking-widest px-2">
                        Back to NFA History
                    </span>
                </button>

                <div className="flex items-center gap-3">
                    <button className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-100 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-gray-50 transition-all shadow-sm">
                        <Download size={18} />
                        <span>Export PDF</span>
                    </button>
                </div>
            </div>

            {/* ── Hero / Title Block ── */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-50/50 rounded-full blur-3xl -mr-24 -mt-24 z-0" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="p-5 bg-indigo-600 text-white rounded-[1.5rem] shadow-xl shadow-indigo-100 shrink-0">
                            <FileText size={32} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(nfa.status)}`}>
                                    {nfa.status}
                                </span>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    ID: {nfa.id}
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">
                                {nfa.nfaNumber}
                            </h1>
                            <p className="text-xl text-gray-500 font-bold mt-1 max-w-2xl">
                                {nfa.itemDescription || 'No description provided'}
                            </p>
                        </div>
                    </div>

                    {/* Current NFA Value Highlight */}
                    <div className="flex items-center gap-8 md:border-l md:border-gray-100 md:pl-8 h-fit self-center">
                        <div className="text-left md:text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                                NFA Value
                            </p>
                            <p className="text-3xl font-black text-gray-900 leading-none">
                                <span className="text-gray-400 text-xl font-bold mr-1">₹</span>
                                {fmt(nfa.currentNFAValue)}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Body ── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── LEFT COLUMN ── */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Key Information Grid */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Activity size={16} className="text-indigo-600" />
                            NFA Information
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            {[
                                {
                                    icon: Calendar,
                                    label: 'NFA Date',
                                    value: nfa.nfaDate
                                        ? new Date(nfa.nfaDate).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : '—',
                                },
                                {
                                    icon: Briefcase,
                                    label: 'Project',
                                    value: nfa.project || '—',
                                },
                                {
                                    icon: Hash,
                                    label: 'NTD Ref No.',
                                    value: nfa.ntdRefNo || '—',
                                },
                                {
                                    icon: IndentIncrease,
                                    label: 'Indent No.',
                                    value: nfa.indentNo || '—',
                                },
                                {
                                    icon: Code2,
                                    label: 'SAP PR No.',
                                    value: nfa.sapPrNo || '—',
                                },
                                {
                                    icon: Activity,
                                    label: 'Prepared By',
                                    value: nfa.createdBy?.name || 'System',
                                },
                            ].map(({ icon: Icon, label, value }) => (
                                <div key={label} className="space-y-1.5 p-2 rounded-2xl transition-all">
                                    <div className="flex items-center space-x-2">
                                        <Icon size={14} className="text-indigo-500" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                            {label}
                                        </p>
                                    </div>
                                    <p className="text-base font-black text-gray-900 truncate">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* WBS Numbers */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Layers size={16} className="text-indigo-600" />
                            WBS Numbers
                            <span className="ml-auto bg-indigo-50 text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full border border-indigo-100">
                                {wbsNumbers.length} CODE{wbsNumbers.length !== 1 ? 'S' : ''}
                            </span>
                        </h3>

                        {wbsNumbers.length > 0 ? (
                            <div className="flex flex-wrap gap-3">
                                {wbsNumbers.map((code, i) => (
                                    <span
                                        key={i}
                                        className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-black rounded-xl border border-indigo-100 tracking-wide"
                                    >
                                        {code}
                                    </span>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
                                <AlertCircle size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    No WBS codes assigned
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Item Description Card */}
                    <div className="bg-indigo-50/30 rounded-[2.5rem] p-10 border border-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-10">
                            <FileText size={80} className="text-indigo-900" />
                        </div>
                        <h3 className="text-[13px] font-black text-indigo-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-indigo-600" />
                            Item / Work Description
                        </h3>
                        <p className="text-sm text-gray-700 font-medium leading-relaxed bg-white/70 p-5 rounded-2xl border border-indigo-100/50">
                            {nfa.itemDescription || 'No item description provided.'}
                        </p>
                        <div className="mt-4 flex gap-4">
                            <div className="flex-1 bg-white/70 p-4 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                    Submitted By
                                </p>
                                <p className="text-xs font-black text-gray-800">
                                    {nfa.createdBy?.name || 'PO Team'}
                                </p>
                            </div>
                            <div className="flex-1 bg-white/70 p-4 rounded-xl border border-indigo-100/50">
                                <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                                    Created
                                </p>
                                <p className="text-xs font-black text-gray-800">
                                    {nfa.createdAt
                                        ? new Date(nfa.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                        })
                                        : '—'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT COLUMN ── */}
                <div className="space-y-8">

                    {/* Financial Summary Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-400 to-emerald-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">
                            Financial Summary
                        </p>

                        <div className="space-y-5">
                            {[
                                { icon: Banknote, label: 'Total Budget', value: nfa.totalBudget, color: 'text-indigo-400' },
                                { icon: BarChart2, label: 'Current NFA Value', value: nfa.currentNFAValue, color: 'text-emerald-400' },
                                { icon: TrendingDown, label: 'Budget Balance', value: nfa.balance, color: 'text-amber-400' },
                                { icon: Scale, label: 'Est. Balance Post', value: nfa.estimatedBalance, color: 'text-blue-400' },
                            ].map(({ icon: Icon, label, value, color }) => (
                                <div key={label} className="group">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="flex items-center gap-2">
                                            <Icon size={14} className={color} />
                                            <p className={`text-[10px] font-black uppercase tracking-widest ${color}`}>
                                                {label}
                                            </p>
                                        </div>
                                        <p className="text-sm font-black text-white">
                                            {value != null ? `₹ ${fmt(value)}` : '—'}
                                        </p>
                                    </div>
                                    {value != null && nfa.totalBudget && (
                                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all"
                                                style={{
                                                    width: `${Math.min(100, (Number(value) / Number(nfa.totalBudget)) * 100)}%`,
                                                    background: 'linear-gradient(to right, #6366f1, #10b981)',
                                                    boxShadow: '0 0 8px rgba(99,102,241,0.5)',
                                                }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Approval Status Timeline */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Target size={16} className="text-indigo-600" />
                            Status Timeline
                        </h3>

                        {/* Simple milestone-style status display */}
                        {(() => {
                            const stages = [
                                { label: 'NFA Created', done: true },
                                { label: 'Submitted', done: ['SUBMITTED', 'APPROVED', 'REJECTED'].includes(nfa.status) },
                                { label: 'Under Review', done: ['APPROVED', 'REJECTED'].includes(nfa.status) },
                                { label: 'Decision', done: ['APPROVED', 'REJECTED'].includes(nfa.status), final: true },
                            ];
                            return (
                                <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-indigo-50">
                                    {stages.map((stage, idx) => (
                                        <div key={idx} className="relative pl-8">
                                            <div className={`absolute left-0 top-[2px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all ${stage.done
                                                    ? stage.final && nfa.status === 'REJECTED'
                                                        ? 'bg-red-500 text-white'
                                                        : 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                                    : 'bg-indigo-50 text-indigo-600 ring-4 ring-white'
                                                }`}>
                                                {stage.done
                                                    ? stage.final && nfa.status === 'REJECTED'
                                                        ? <X size={14} />
                                                        : <Check size={14} />
                                                    : <div className="p-1 rounded-full bg-indigo-600 animate-pulse" />
                                                }
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <p className="text-sm font-black text-gray-900">{stage.label}</p>
                                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${stage.done
                                                        ? stage.final && nfa.status === 'REJECTED'
                                                            ? 'text-red-600 bg-red-50'
                                                            : 'text-emerald-600 bg-emerald-50'
                                                        : 'text-indigo-600 bg-indigo-50'
                                                    }`}>
                                                    {stage.done ? (stage.final ? nfa.status : 'Done') : 'Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Document Attachment */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transition-transform group-hover:scale-110 duration-500">
                            <Download size={64} />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">Supporting Archive</h4>
                        <p className="text-2xl font-black mb-6">Documents</p>

                        <div className="space-y-3 relative z-10">
                            {nfa.documentPath ? (
                                <>
                                    {/* Download row */}
                                    <a
                                        href={getDocumentUrl(nfa.documentPath)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white/20 rounded-lg">
                                                <FileText size={18} className="text-white" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-xs font-black uppercase tracking-widest text-indigo-100">
                                                    NFA Document
                                                </p>
                                                <p className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">
                                                    {nfa.documentPath}
                                                </p>
                                            </div>
                                        </div>
                                        <Download
                                            size={14}
                                            className="opacity-50 group-hover/item:opacity-100 transition-opacity"
                                        />
                                    </a>

                                    {/* Preview button */}
                                    <button
                                        onClick={openPreview}
                                        disabled={previewLoading}
                                        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 p-3.5 rounded-2xl border border-white/10 transition-all text-xs font-black uppercase tracking-widest"
                                    >
                                        {previewLoading ? (
                                            <Loader2 size={14} className="animate-spin" />
                                        ) : (
                                            <Eye size={14} />
                                        )}
                                        {previewLoading ? 'Converting…' : 'Preview Document'}
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 border-dashed bg-white/5">
                                    <AlertCircle size={24} className="text-white/20 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">
                                        No digital attachments found for this NFA
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Metadata Footer Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Clock3 size={16} className="text-indigo-600" />
                            Record Metadata
                        </h3>
                        <div className="space-y-4">
                            {[
                                { label: 'NFA Number', value: nfa.nfaNumber },

                                {
                                    label: 'Created At',
                                    value: nfa.createdAt
                                        ? new Date(nfa.createdAt).toLocaleString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })
                                        : '—',
                                },
                                {
                                    label: 'Last Updated',
                                    value: nfa.updatedAt
                                        ? new Date(nfa.updatedAt).toLocaleString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit',
                                        })
                                        : '—',
                                },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                    <p className="text-xs font-black text-gray-700">{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* ── PDF Preview Modal ─────────────────────────────────────────────── */}
        {previewOpen && (
            <div
                className="fixed inset-0 z-50 flex flex-col"
                style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)' }}
            >
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-4 bg-gray-900 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-600 rounded-xl">
                            <FileText size={16} className="text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Document Preview</p>
                            <p className="text-sm font-black text-white truncate max-w-[400px]">{nfa.documentPath}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <a
                            href={getDocumentUrl(nfa.documentPath)}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black px-4 py-2 rounded-xl border border-white/10 transition-all"
                        >
                            <Download size={13} /> Download Original
                        </a>
                        <button
                            onClick={closePreview}
                            className="p-2 bg-white/10 hover:bg-red-500 text-white rounded-xl border border-white/10 transition-all"
                            title="Close preview"
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* PDF iframe */}
                <div className="flex-1 relative">
                    <iframe
                        src={previewUrl}
                        title="NFA Document Preview"
                        className="w-full h-full border-0"
                        style={{ background: '#525659' }}
                    />
                </div>
            </div>
        )}
        </>
    );
};

export default NfaDetailPage;
