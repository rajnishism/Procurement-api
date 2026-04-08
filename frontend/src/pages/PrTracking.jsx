import React, { useState, useEffect } from 'react';
import { Search, FileText, Clock, AlertCircle, Download, Trash2, Calendar, Eye, X, User, Users, Building2, Hash, DollarSign, ExternalLink, UserCheck, UploadCloud, ClipboardList, CheckCircle2, GitCompare, ClipboardCheck, Edit3, Check } from 'lucide-react';
import api from '../api/axios';

// ─────────────────────────────────────────────────
// APPROVAL STATUS MINI-COMPONENT
// ─────────────────────────────────────────────────
const approvalStatusCfg = {
    APPROVED: { color: '#059669', bg: '#d1fae5', label: 'Approved', icon: '✅' },
    REJECTED: { color: '#dc2626', bg: '#fee2e2', label: 'Rejected', icon: '❌' },
    PENDING: { color: '#d97706', bg: '#fef3c7', label: 'Pending', icon: '⏳' },
};

const roleMapping = {
    INDENTOR: 'Indentor (Confirmation)',
    STAGE1: 'PR Approver (Stage 1)',
    STAGE2: 'Verifier (Stage 2)',
    STAGE3: 'Final Approver (Stage 3)',
};

// ─────────────────────────────────────────────────
// PR DETAIL SLIDE-OVER
// ─────────────────────────────────────────────────
const PrDetailDrawer = ({ pr, onClose }) => {
    const [approvals, setApprovals] = useState([]);
    const [loadingApprovals, setLoadingApprovals] = useState(false);
    const [techSpec, setTechSpec] = useState(null);
    const [showTechModal, setShowTechModal] = useState(false);
    const [showReviewModal, setShowReviewModal] = useState(false);
    const [isEditingWbs, setIsEditingWbs] = useState(false);
    const [tempWbs, setTempWbs] = useState(pr?.wbsCode || '');
    const [savingWbs, setSavingWbs] = useState(false);

    const handleSaveWbs = async () => {
        setSavingWbs(true);
        try {
            await api.patch(`/prs/${pr.id}`, { wbsCode: tempWbs });
            pr.wbsCode = tempWbs; // Optimistic update
            setIsEditingWbs(false);
        } catch (err) {
            alert('Failed to update WBS Code');
        } finally {
            setSavingWbs(false);
        }
    };

    useEffect(() => {
        if (!pr?.id) return;
        setLoadingApprovals(true);
        api.get(`/prs/${pr.id}/approvals`)
            .then(res => setApprovals(res.data))
            .catch(() => setApprovals([]))
            .finally(() => setLoadingApprovals(false));
        // Also fetch tech spec status
        api.get(`/tech-specs/${pr.id}`)
            .then(res => setTechSpec(res.data))
            .catch(() => setTechSpec(null));
    }, [pr?.id]);

    if (!pr) return null;

    const getStatusStyle = (s) => {
        switch (s) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'PENDING': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    const lineItems = Array.isArray(pr.lineItems) ? pr.lineItems : (pr.lineItems ? JSON.parse(pr.lineItems) : []);

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
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Purchase Requisition</p>
                            <h2 className="text-xl font-black text-gray-900">{pr.prNumber}</h2>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(pr.status)}`}>
                            {pr.status}
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
                                { icon: Calendar, label: 'Date of Indent', value: pr.prDate ? new Date(pr.prDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                                { icon: Clock, label: 'Budget Period', value: pr.month && pr.year ? new Date(pr.year, pr.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : '—' },
                                { icon: Building2, label: 'Department', value: pr.department?.name || '—' },
                                {
                                    icon: Hash,
                                    label: 'WBS Code',
                                    value: isEditingWbs ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                autoFocus
                                                value={tempWbs}
                                                onChange={e => setTempWbs(e.target.value)}
                                                className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold text-gray-800 outline-none focus:ring-2 ring-blue-500/20 w-full"
                                                placeholder="Enter WBS..."
                                            />
                                            <button
                                                onClick={handleSaveWbs}
                                                disabled={savingWbs}
                                                className="p-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                                            >
                                                {savingWbs ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white" /> : <Check size={14} />}
                                            </button>
                                            <button
                                                onClick={() => { setIsEditingWbs(false); setTempWbs(pr.wbsCode || ''); }}
                                                className="p-1 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <span className={pr.wbsCode ? "text-sm font-bold text-gray-800 truncate" : "text-sm font-bold text-amber-600 italic"}>
                                                {pr.wbsCode || 'Click to fill WBS'}
                                            </span>
                                            <button
                                                onClick={() => { setTempWbs(pr.wbsCode || ''); setIsEditingWbs(true); }}
                                                className="p-1 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Edit3 size={12} />
                                            </button>
                                        </div>
                                    ),
                                    isCustom: true
                                },
                                { icon: DollarSign, label: 'Total Value', value: pr.totalValue ? `$${parseFloat(pr.totalValue).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—' },
                                { icon: Calendar, label: 'Date of Approval', value: pr.dateOfApproval ? new Date(pr.dateOfApproval).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not yet approved' },
                            ].map(({ icon: Icon, label, value, isCustom }) => (
                                <div key={label} className="bg-gray-50 rounded-xl p-3.5 border border-transparent hover:border-gray-200 transition-colors">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <Icon size={13} className="text-gray-400" />
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                    </div>
                                    {isCustom ? value : <p className="text-sm font-bold text-gray-800 truncate">{value}</p>}
                                </div>
                            ))}
                        </div>
                    </div>



                    {/* Description */}
                    {pr.description && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Description / Notes</p>
                            <p className="text-sm text-gray-600 font-medium bg-gray-50 rounded-xl p-4 leading-relaxed" style={{ whiteSpace: 'pre-line' }}>{pr.description}</p>
                        </div>
                    )}

                    {/* Line Items */}
                    {lineItems.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Line Items ({lineItems.length})</p>
                            <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase">S.No</th>
                                            <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase">Description</th>
                                            <th className="px-4 py-2.5 text-[9px] font-black text-gray-400 uppercase text-right">Est. Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {lineItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-white transition-colors">
                                                <td className="px-4 py-2.5 font-bold text-gray-400 align-top">{item.sNo}</td>
                                                <td className="px-4 py-2.5 font-medium text-gray-700">{item.text || item.description}</td>
                                                <td className="px-4 py-2.5 text-right font-black text-gray-400">—</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Budget Allocations */}
                    {pr.allocations?.length > 0 && (
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Budget Allocations</p>
                            <div className="space-y-2">
                                {pr.allocations.map((alloc, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">
                                        <div>
                                            <p className="text-[9px] font-black text-blue-400 uppercase">{alloc.budgetHead?.code}</p>
                                            <p className="text-sm font-bold text-blue-800">{alloc.budgetHead?.name || 'Unknown Head'}</p>
                                            {alloc.subClassification && <p className="text-xs text-blue-500 font-medium mt-0.5">{alloc.subClassification.name}</p>}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-base font-black text-blue-900">${parseFloat(alloc.amount).toLocaleString()}</p>
                                            {alloc.isManualOverride && <p className="text-[9px] font-bold text-amber-600 flex items-center justify-end gap-1 mt-0.5"><AlertCircle size={10} /> Override</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Approval Status */}
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                            <UserCheck size={12} /> Approval Status
                        </p>
                        {loadingApprovals ? (
                            <div className="text-center py-4 text-gray-400 text-xs">Loading approvals...</div>
                        ) : approvals.length === 0 ? (
                            <div className="bg-gray-50 rounded-xl px-4 py-4 text-xs text-gray-400 italic">No approval requests sent yet for this PR.</div>
                        ) : (
                            <div className="rounded-xl overflow-hidden border border-gray-100">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2.5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Approver</th>
                                            <th className="px-4 py-2.5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Role</th>
                                            <th className="px-4 py-2.5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                            <th className="px-4 py-2.5 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Comments</th>
                                            <th className="px-4 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {approvals.map(a => {
                                            const cfg = approvalStatusCfg[a.status] || approvalStatusCfg.PENDING;
                                            return (
                                                <tr key={a.id}>
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-gray-900">{a.approver?.name}</p>
                                                        <p className="text-[10px] text-gray-400">{a.approver?.email}</p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-tight bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                                                            {roleMapping[a.role] || a.role}
                                                        </p>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span style={{ background: cfg.bg, color: cfg.color }}
                                                            className="inline-block px-2 py-0.5 rounded-full font-black text-[10px]">
                                                            {cfg.icon} {cfg.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-gray-500 max-w-[120px] truncate">{a.comments || '—'}</td>
                                                    <td className="px-4 py-3 text-right text-gray-400">
                                                        {a.respondedAt ? new Date(a.respondedAt).toLocaleDateString() : '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>


                </div>

                {/* Footer */}
                <div className="px-7 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-gray-400 italic">System Serial: {pr.id.slice(0, 8)}</p>
                    <div className="flex items-center gap-2">
                        {pr.pdfPath && (
                            <a
                                href={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}/api/uploads/${pr.pdfPath.includes('AI-TMP') ? 'quotations' : 'pdfs'}/${pr.pdfPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-colors"
                            >
                                <ExternalLink size={12} />
                                View PDF
                            </a>
                        )}
                        {pr.excelPath && (
                            <a
                                href={`${(import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace('/api', '')}/api/uploads/output/${pr.excelPath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-4 py-2.5 rounded-xl transition-colors"
                            >
                                <Download size={12} />
                                Excel PR
                            </a>
                        )}
                    </div>
                </div>
            </div>

            {showTechModal && (
                <TechSpecUploadModal
                    prId={pr.id}
                    onClose={() => setShowTechModal(false)}
                    onSuccess={() => {
                        api.get(`/tech-specs/${pr.id}`).then(res => setTechSpec(res.data)).catch(() => { });
                    }}
                />
            )}

            {showReviewModal && (
                <TechReviewModal
                    pr={pr}
                    onClose={() => setShowReviewModal(false)}
                />
            )}
        </>
    );
};

// ─────────────────────────────────────────────────
// TECH REVIEW MODAL
// ─────────────────────────────────────────────────
const TechReviewModal = ({ pr, onClose }) => {
    const [quotes, setQuotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [reviewedBy, setReviewedBy] = useState('');
    const [reviewMap, setReviewMap] = useState({}); // quotationId -> { techStatus, remarks, risks }
    const [saving, setSaving] = useState({}); // quotationId -> boolean

    useEffect(() => {
        const fetchData = async () => {
            if (!pr?.id) return;
            setLoading(true);
            try {
                // Fetch quotes
                const qRes = await api.get(`/quotations/pr/${pr.id}`);
                setQuotes(qRes.data);

                // Fetch existing reviews for each unique RFQ in quotes
                const rfqIds = [...new Set(qRes.data.map(q => q.rfqId))];
                for (const rfqId of rfqIds) {
                    try {
                        const rRes = await api.get(`/tech-reviews/${rfqId}`);
                        rRes.data.forEach(rev => {
                            setReviewMap(prev => ({ ...prev, [rev.quotationId]: rev }));
                            if (rev.reviewedBy && !reviewedBy) setReviewedBy(rev.reviewedBy);
                        });
                    } catch (e) { /* no reviews yet */ }
                }
            } catch (err) {
                console.error('Fetch data failed', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [pr?.id]);

    const handleUpdate = (qId, field, value) => {
        setReviewMap(prev => ({
            ...prev,
            [qId]: { ...(prev[qId] || { techStatus: 'COMPLIANT' }), [field]: value }
        }));
    };

    const handleSave = async (qId, rfqId) => {
        const rev = reviewMap[qId];
        if (!rev?.techStatus) return alert('Please select a status');
        setSaving(prev => ({ ...prev, [qId]: true }));
        try {
            await api.post('/tech-reviews', {
                rfqId,
                quotationId: qId,
                techStatus: rev.techStatus,
                remarks: rev.remarks || '',
                risks: rev.risks || '',
                reviewedBy: reviewedBy || 'Technical Team'
            });
            alert('Progress saved');
        } catch (err) {
            alert('Selection failed to save.');
        } finally {
            setSaving(prev => ({ ...prev, [qId]: false }));
        }
    };

    if (!pr) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[80] flex items-center justify-center p-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="bg-indigo-600 px-10 py-8 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 text-indigo-100 mb-1">
                            <GitCompare size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Technical Review Phase</span>
                        </div>
                        <h3 className="text-white font-black text-2xl leading-none">Vendor Comparison Matrix</h3>
                    </div>
                    <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8 border-b border-gray-100 bg-gray-50 flex items-center gap-6">
                    <div className="flex-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">Reviewed By (Name/Dept)</label>
                        <input
                            value={reviewedBy}
                            onChange={(e) => setReviewedBy(e.target.value)}
                            placeholder="e.g. Mechanical Dept / John Doe"
                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-700 outline-none focus:ring-2 ring-indigo-500/20"
                        />
                    </div>
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-6 py-4 flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Quotations Received</p>
                            <p className="text-xl font-black text-indigo-700 leading-none">{quotes.length}</p>
                        </div>
                        <Users size={32} className="text-indigo-400 opacity-50" />
                    </div>
                </div>

                {/* Main scroll area */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Loading comparison data...</p>
                        </div>
                    ) : quotes.length === 0 ? (
                        <div className="text-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
                            <Users size={48} className="mx-auto text-gray-300 mb-4" />
                            <p className="text-gray-500 font-bold">No quotations have been received for this PR yet.</p>
                            <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">RFQs MUST BE RESPONDED BY VENDORS FIRST</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {quotes.map(q => {
                                const rev = reviewMap[q.id] || { techStatus: 'COMPLIANT' };
                                return (
                                    <div key={q.id} className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex flex-col lg:flex-row gap-8">
                                            {/* Vendor Info & Offering */}
                                            <div className="lg:w-1/3">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                                                        <Building2 size={24} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Vendor</p>
                                                        <h4 className="text-lg font-black text-gray-800 leading-tight">{q.vendor.name}</h4>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="bg-gray-50 rounded-xl p-3">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Quotation Ref</p>
                                                        <p className="text-xs font-bold text-gray-700 truncate">{q.rfq.rfqNumber}-Q</p>
                                                    </div>
                                                    <div className="bg-gray-50 rounded-xl p-3">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Offered Items</p>
                                                        <div className="space-y-1">
                                                            {(q.lineItems || []).map((li, idx) => (
                                                                <div key={idx} className="flex justify-between text-[11px] font-bold text-gray-600">
                                                                    <span className="truncate mr-2">{li.description}</span>
                                                                    <span className="flex-shrink-0">Qty: {li.qty}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Technical Review Inputs */}
                                            <div className="flex-1 space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Tech Status</label>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            {[
                                                                { val: 'COMPLIANT', lab: 'Fully Compliant', col: 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:border-emerald-300' },
                                                                { val: 'DEVIATION', lab: 'Compliant with Deviation', col: 'text-amber-700 bg-amber-50 border-amber-100 hover:border-amber-300' },
                                                                { val: 'NOT_FIT', lab: 'Technically Not Fit', col: 'text-red-700 bg-red-50 border-red-100 hover:border-red-300' },
                                                            ].map(opt => (
                                                                <button
                                                                    key={opt.val}
                                                                    type="button"
                                                                    onClick={() => handleUpdate(q.id, 'techStatus', opt.val)}
                                                                    className={`px-4 py-2.5 rounded-xl border-2 transition-all text-left text-xs font-black ${opt.col} ${rev.techStatus === opt.val ? 'ring-2 ring-offset-2 ring-indigo-500 border-indigo-500' : ''}`}
                                                                >
                                                                    {rev.techStatus === opt.val ? '● ' : '○ '} {opt.lab}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Technical Assessment / Remarks</label>
                                                        <textarea
                                                            value={rev.remarks || ''}
                                                            onChange={(e) => handleUpdate(q.id, 'remarks', e.target.value)}
                                                            className="w-full h-[155px] bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold text-gray-700 outline-none focus:ring-2 ring-indigo-500/20 resize-none"
                                                            placeholder="State how the offer matches PR requirements..."
                                                        />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 block">Potential Risks / Observations</label>
                                                    <input
                                                        value={rev.risks || ''}
                                                        onChange={(e) => handleUpdate(q.id, 'risks', e.target.value)}
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-700 outline-none focus:ring-2 ring-indigo-500/20"
                                                        placeholder="e.g. Longer delivery than specified, uses alternative material"
                                                    />
                                                </div>
                                                <div className="flex justify-end pt-2">
                                                    <button
                                                        disabled={saving[q.id]}
                                                        onClick={() => handleSave(q.id, q.rfqId)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-black text-xs px-8 py-3 rounded-xl shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
                                                    >
                                                        {saving[q.id] ? <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/20 border-t-white" /> : <ClipboardCheck size={16} />}
                                                        {saving[q.id] ? 'Saving...' : 'Save Decision'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────
// TECH SPEC UPLOAD MODAL
// ─────────────────────────────────────────────────
const TechSpecUploadModal = ({ prId, onClose, onSuccess }) => {
    const [notes, setNotes] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setUploading(true);
        setError(null);
        try {
            const formData = new FormData();
            formData.append('prId', prId);
            formData.append('notes', notes);
            if (file) formData.append('file', file);
            await api.post('/tech-specs', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            onSuccess?.();
            onClose();
        } catch (err) {
            setError(err.response?.data?.error || 'Upload failed.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-blue-600 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <ClipboardList size={20} className="text-white" />
                        <h3 className="text-white font-black text-lg">Upload Technical Specification</h3>
                    </div>
                    <button onClick={onClose} className="text-blue-200 hover:text-white"><X size={20} /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="text-red-600 text-xs font-bold bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</div>}
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Notes / Remarks</label>
                        <textarea
                            className="w-full border-2 border-gray-200 focus:border-blue-400 rounded-xl px-4 py-3 text-sm outline-none resize-none"
                            rows={3}
                            placeholder="e.g. BOQ attached, refer to drawing A-12..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Attachment (PDF, Excel, Word, Image)</label>
                        <input
                            type="file"
                            accept=".pdf,.xls,.xlsx,.doc,.docx,.png,.jpg"
                            className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            onChange={e => setFile(e.target.files[0])}
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 border-2 border-gray-200 text-gray-500 font-black py-3 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                        <button type="submit" disabled={uploading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                            {uploading ? 'Uploading...' : <><UploadCloud size={16} /> Upload</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────
// DELETE REASON MODAL
// ─────────────────────────────────────────────────
const DeleteModal = ({ pr, onConfirm, onCancel }) => {
    const [reason, setReason] = React.useState('');
    const isValid = reason.trim().length > 0;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-600 px-6 py-5">
                    <h3 className="text-white font-black text-lg">Delete PR</h3>
                    <p className="text-red-100 text-xs mt-1">This action cannot be undone. Approvers will be notified.</p>
                </div>
                <div className="p-6">
                    <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-sm">
                        <p className="font-black text-red-800">{pr.prNumber}</p>
                        <p className="text-red-500 text-xs mt-0.5">{pr.description}</p>
                    </div>
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">
                        Reason for Deletion <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        autoFocus
                        className="w-full border-2 border-gray-200 focus:border-red-400 rounded-xl px-4 py-3 text-sm font-medium outline-none resize-none transition-colors"
                        rows={3}
                        placeholder="e.g. Duplicate PR, requirements changed, budget cut..."
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                    />
                    {!isValid && reason.length > 0 && (
                        <p className="text-red-500 text-xs mt-1">Reason cannot be empty.</p>
                    )}
                    <div className="flex gap-3 mt-5">
                        <button
                            onClick={() => onConfirm(reason.trim())}
                            disabled={!isValid}
                            className={`flex-1 py-3 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${isValid
                                ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-100'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                }`}
                        >
                            Confirm Delete
                        </button>
                        <button
                            onClick={onCancel}
                            className="px-5 py-3 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────
const PrTracking = ({ filterStatus: initialFilter = 'ALL' }) => {
    const [prs, setPrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState(initialFilter);

    useEffect(() => {
        setFilterStatus(initialFilter);
    }, [initialFilter]);
    const [selectedPr, setSelectedPr] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // PR to delete

    useEffect(() => {
        fetchPrs();
    }, []);

    const fetchPrs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/prs');
            setPrs(res.data);
        } catch (err) {
            console.error('Error fetching PRs', err);
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetails = async (id) => {
        try {
            const res = await api.get(`/prs/${id}`);
            setSelectedPr(res.data);
        } catch (err) {
            console.error('Error fetching PR details', err);
        }
    };

    const handleDelete = async (id, reason) => {
        try {
            await api.delete(`/prs/${id}`, { data: { reason } });
            setDeleteTarget(null);
            fetchPrs();
            if (selectedPr?.id === id) setSelectedPr(null);
        } catch (err) {
            console.error('Error deleting PR', err);
            alert(err.response?.data?.error || 'Failed to delete PR.');
        }
    };

    const filteredPrs = prs.filter(pr => {
        const matchesSearch =
            pr.prNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pr.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            pr.wbsCode?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || pr.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'PENDING': return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    return (
        <>
            {deleteTarget && (
                <DeleteModal
                    pr={deleteTarget}
                    onConfirm={(reason) => handleDelete(deleteTarget.id, reason)}
                    onCancel={() => setDeleteTarget(null)}
                />
            )}
            <PrDetailDrawer pr={selectedPr} onClose={() => setSelectedPr(null)} />

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight">{initialFilter === 'ALL' ? 'Purchase Requisition History' : 'Purchase Requisition Tracker'}</h2>
                        <p className="text-gray-500 font-medium">{initialFilter === 'ALL' ? 'Complete archive of all PR requests raised' : 'Monitoring approved requisitions and budget execution'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3000/api'}/migration/export-db`, '_blank')}
                            className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-indigo-100 transition-all"
                        >
                            <Download size={18} />
                            <span>Full DB Export</span>
                        </button>
                        <button className="flex items-center space-x-2 bg-gray-50 hover:bg-gray-100 text-gray-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 transition-all">
                            <Download size={18} />
                            <span>Export CSV</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[300px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by PR#, Description, or WBS..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {initialFilter === 'ALL' && (
                        <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl">
                            {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${filterStatus === status ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredPrs.map(pr => (
                            <div
                                key={pr.id}
                                className="bg-white rounded-[1.5rem] border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group"
                            >
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start space-x-4">
                                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                            <FileText size={24} />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-3 mb-1">
                                                <h3 className="text-lg font-black text-gray-800">{pr.prNumber}</h3>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusStyle(pr.status)}`}>
                                                    {pr.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 font-medium line-clamp-1 mb-2">{pr.description}</p>
                                            <div className="flex flex-wrap items-center gap-4">
                                                <div className="flex items-center text-xs font-bold text-gray-400">
                                                    <Clock size={14} className="mr-1.5" />
                                                    {new Date(pr.prDate).toLocaleDateString()}
                                                </div>
                                                <div className="flex items-center text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                    WBS: {pr.wbsCode || 'UNMAPPED'}
                                                </div>
                                                <div className="text-xs font-bold text-indigo-500">
                                                    Dept: {pr.department?.name}
                                                </div>
                                                <div className="flex items-center text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
                                                    <Calendar size={14} className="mr-1.5" />
                                                    Alloc: {new Date(pr.year, pr.month - 1).toLocaleString('default', { month: 'short', year: 'numeric' })}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pr-2">
                                        <div className="text-2xl font-black text-gray-900">
                                            ${parseFloat(pr.totalValue).toLocaleString()}
                                        </div>
                                        <div className="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                            {/* View Details */}
                                            <button
                                                onClick={() => handleViewDetails(pr.id)}
                                                className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                                title="View Full Details"
                                            >
                                                <Eye size={14} /> Details
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(pr)}
                                                className="text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 p-2 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                                                title="Delete PR"
                                            >
                                                <Trash2 size={14} /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Allocations Preview */}
                                {pr.allocations?.length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mr-2 flex-shrink-0">Linked To:</span>
                                        {pr.allocations.map((alloc, idx) => (
                                            <div key={idx} className="flex items-center bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100 flex-shrink-0">
                                                <div className="mr-2">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase leading-none">{alloc.budgetHead?.name}</p>
                                                    <p className="text-[10px] font-bold text-gray-700">${parseFloat(alloc.amount).toLocaleString()}</p>
                                                </div>
                                                {alloc.isManualOverride && <AlertCircle size={12} className="text-amber-500 ml-1" />}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}

                        {filteredPrs.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-[2rem] border border-dashed border-gray-300">
                                <FileText size={48} className="text-gray-300 mb-4" />
                                <p className="text-gray-500 font-bold">No purchase requisitions found matching your filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

export default PrTracking;
