import React, { useState, useEffect } from 'react';
import {
    Plus, Send, Eye, CheckCircle, XCircle, FileText, Users, BarChart3,
    Calendar, Building2, IndianRupee, Tag, AlertCircle, ChevronRight,
    Clock, Package
} from 'lucide-react';
import api from '../api/axios';

/* ─── Status config ──────────────────────────────────────────── */
const STATUS = {
    DRAFT: { label: 'Draft', bg: '#f3f4f6', color: '#6b7280' },
    SENT: { label: 'Sent', bg: '#fef3c7', color: '#d97706' },
    CLOSED: { label: 'Closed', bg: '#d1fae5', color: '#059669' },
    CANCELLED: { label: 'Cancelled', bg: '#fee2e2', color: '#dc2626' },
};

const fmtCur = v => `₹${Number(v || 0).toLocaleString('en-IN')}`;
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
const daysLeft = deadline => {
    const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
    if (diff < 0) return { txt: `${Math.abs(diff)}d overdue`, cls: 'text-red-600' };
    if (diff === 0) return { txt: 'Due today', cls: 'text-red-500' };
    if (diff <= 3) return { txt: `${diff}d left`, cls: 'text-amber-600' };
    return { txt: `${diff}d left`, cls: 'text-emerald-600' };
};

/* ─── Tiny reusable field components ─────────────────────────── */
const Label = ({ children }) => (
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{children}</p>
);
const Input = ({ ...props }) => (
    <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-400 transition-colors" {...props} />
);

/* ═══════════════════════════════════════════════════════════════ */
const RFQManagement = () => {
    const [rfqs, setRfqs] = useState([]);
    const [approvedPRs, setApprovedPRs] = useState([]);
    const [allPRs, setAllPRs] = useState([]);  // for showing existing RFQ status
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);

    /* modal state */
    const [showCreate, setShowCreate] = useState(false);
    const [detailRFQ, setDetailRFQ] = useState(null);  // full RFQ detail from API
    const [compareRFQ, setCompareRFQ] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    /* create form */
    const [selectedPR, setSelectedPR] = useState(null); // full PR object
    const [form, setForm] = useState({ prId: '', title: '', description: '', deadline: '' });
    const [sendVendors, setSendVendors] = useState([]);
    const [sending, setSending] = useState(false);
    const [creating, setCreating] = useState(false);

    /* ── fetch ── */
    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rfqRes, prRes, vendorRes] = await Promise.all([
                api.get('/rfqs'),
                api.get('/prs', { params: { status: 'APPROVED' } }),  // server-filtered
                api.get('/vendors'),
            ]);

            const prs = Array.isArray(prRes.data) ? prRes.data : [];
            console.log('[RFQ] Approved PRs fetched:', prs.length, prs.map(p => p.prNumber));
            // Safety net: client-side filter too (belt + suspenders)
            const approved = prs.filter(p => p.status === 'APPROVED' && !p.deletedAt);
            setAllPRs(approved);
            setApprovedPRs(approved);
            setRfqs(Array.isArray(rfqRes.data) ? rfqRes.data : []);
            setVendors(Array.isArray(vendorRes.data) ? vendorRes.data : []);
        } catch (e) {
            console.error('[RFQ] fetchAll error:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAll(); }, []);

    /* ── open RFQ detail ── */
    const openDetail = async (rfq) => {
        setLoadingDetail(true);
        setDetailRFQ({ ...rfq, _loading: true });
        try {
            const res = await api.get(`/rfqs/${rfq.id}`);
            setDetailRFQ(res.data);
        } catch (e) {
            setDetailRFQ(rfq);
        } finally {
            setLoadingDetail(false);
        }
    };

    /* ── open Compare (need full data with vendors+quotations) ── */
    const openCompare = async (rfq) => {
        try {
            const res = await api.get(`/rfqs/${rfq.id}`);
            setCompareRFQ(res.data);
        } catch (e) {
            setCompareRFQ(rfq);
        }
    };

    /* ── create RFQ ── */
    const handleCreate = async () => {
        if (!form.prId) return alert('Please select an approved PR.');
        if (!form.title) return alert('RFQ Title is required.');
        if (!form.deadline) return alert('Closing date is required.');
        setCreating(true);
        try {
            await api.post('/rfqs', form);
            setShowCreate(false);
            setForm({ prId: '', title: '', description: '', deadline: '' });
            setSelectedPR(null);
            fetchAll();
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to create RFQ.');
        } finally {
            setCreating(false);
        }
    };

    /* ── send RFQ to vendors ── */
    const handleSend = async (rfqId) => {
        if (!sendVendors.length) return alert('Select at least one vendor.');
        setSending(true);
        try {
            const res = await api.post(`/rfqs/${rfqId}/send`, { vendorIds: sendVendors });
            setSendVendors([]);
            fetchAll();
            // Refresh detail
            const fresh = await api.get(`/rfqs/${rfqId}`);
            setDetailRFQ(fresh.data);
            alert(`RFQ sent to ${res.data.newVendors} new vendor(s). Invitation emails dispatched.`);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to send RFQ.');
        } finally {
            setSending(false);
        }
    };

    /* ── select vendor / award ── */
    const handleSelectVendor = async (rfqId, quotationId) => {
        if (!window.confirm('Award this RFQ to the selected vendor? This will close the RFQ and reject other quotations.')) return;
        try {
            await api.post(`/rfqs/${rfqId}/select-vendor`, { quotationId });
            fetchAll();
            setCompareRFQ(null);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to select vendor.');
        }
    };

    /* ─────────────────────────── RENDER ─────────────────────────── */
    if (loading) return (
        <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-6">

            {/* ── Header ── */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight">RFQ Management</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Request for Quotation — competitive price discovery sent to multiple vendors
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-violet-100"
                >
                    <Plus size={18} className="mr-2" /> New RFQ
                </button>
            </div>

            {/* ── Flow reminder banner ── */}
            <div className="bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100 rounded-2xl px-5 py-3 flex items-center gap-3 text-xs text-violet-700 font-semibold">
                <FileText size={14} className="flex-shrink-0" />
                <span>Flow: <strong>PR Approved</strong> → Create RFQ → Send to Vendors → Collect Quotes → Compare → Select Vendor → Issue PO</span>
            </div>

            {/* ── Stats row ── */}
            {rfqs.length > 0 && (
                <div className="grid grid-cols-4 gap-4">
                    {[
                        { label: 'Total RFQs', val: rfqs.length, color: 'bg-violet-100 text-violet-700' },
                        { label: 'Open / Sent', val: rfqs.filter(r => r.status === 'SENT').length, color: 'bg-amber-100 text-amber-700' },
                        { label: 'Closed', val: rfqs.filter(r => r.status === 'CLOSED').length, color: 'bg-emerald-100 text-emerald-700' },
                        { label: 'Available PRs', val: approvedPRs.length, color: 'bg-blue-100 text-blue-700' },
                    ].map(s => (
                        <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                            <p className="text-2xl font-black text-gray-900">{s.val}</p>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* ── RFQ List ── */}
            <div className="grid gap-3">
                {rfqs.length === 0 && (
                    <div className="bg-white rounded-2xl p-14 text-center border border-gray-100">
                        <FileText size={44} className="mx-auto mb-3 text-violet-200" />
                        <p className="font-black text-gray-400 text-lg">No RFQs yet</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {approvedPRs.length === 0
                                ? 'No approved PRs available. Approve a PR first to create an RFQ.'
                                : `${approvedPRs.length} approved PR(s) ready. Click "New RFQ" to get started.`}
                        </p>
                    </div>
                )}

                {rfqs.map(rfq => {
                    const s = STATUS[rfq.status] || STATUS.DRAFT;
                    const responded = rfq.rfqVendors?.filter(v => v.status === 'RESPONDED').length || 0;
                    const sent = rfq.rfqVendors?.length || 0;
                    const dl = daysLeft(rfq.deadline);
                    const hasQuotes = (rfq._count?.quotations || 0) > 0;

                    return (
                        <div key={rfq.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
                            <div className="flex items-stretch">
                                {/* Colour bar */}
                                <div className="w-1.5 flex-shrink-0" style={{ background: s.color }} />

                                <div className="flex-1 p-5 flex items-center justify-between gap-4">
                                    {/* Left — RFQ info */}
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                                            <FileText size={22} className="text-violet-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-gray-900 text-base">{rfq.rfqNumber}</span>
                                                <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-700 mt-0.5 truncate">{rfq.title}</p>
                                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Tag size={11} /> {rfq.pr?.prNumber || '—'}
                                                </span>
                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Users size={11} /> {sent} vendors · {responded} quoted
                                                </span>
                                                <span className={`text-xs font-bold flex items-center gap-1 ${dl.cls}`}>
                                                    <Clock size={11} /> {dl.txt}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    Closing: {fmtDate(rfq.deadline)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right — actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {hasQuotes && (
                                            <button
                                                onClick={() => openCompare(rfq)}
                                                className="px-3 py-1.5 rounded-xl bg-indigo-50 text-indigo-700 text-xs font-black flex items-center gap-1 hover:bg-indigo-100 transition-colors"
                                            >
                                                <BarChart3 size={13} /> Compare ({rfq._count.quotations})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => openDetail(rfq)}
                                            className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-black flex items-center gap-1 hover:bg-gray-200 transition-colors"
                                        >
                                            <Eye size={13} /> Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>


            {/* ════════════════════════════════════════════════════
                CREATE RFQ MODAL
                ════════════════════════════════════════════════════ */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden">

                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5">
                            <h3 className="text-white font-black text-lg">Create New RFQ</h3>
                            <p className="text-violet-100 text-xs mt-1">Select an approved PR, set a title and closing date, then send to vendors</p>
                        </div>

                        <div className="p-6 space-y-5">

                            {/* ── STEP 1: Select PR ── */}
                            <div>
                                <Label>Step 1 — Select Approved PR *</Label>

                                {approvedPRs.length === 0 ? (
                                    <div className="rounded-xl border-2 border-dashed border-amber-200 bg-amber-50 p-4 text-center">
                                        <AlertCircle size={24} className="text-amber-400 mx-auto mb-1" />
                                        <p className="text-sm font-bold text-amber-700">No approved PRs found</p>
                                        <p className="text-xs text-amber-600 mt-1">Go to PR Tracking and approve a PR first, then come back here.</p>
                                    </div>
                                ) : (
                                    <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                                        {approvedPRs.map(pr => {
                                            const lineItems = Array.isArray(pr.lineItems) ? pr.lineItems : [];
                                            const isSelected = form.prId === pr.id;
                                            // Check if this PR already has an RFQ
                                            const existingRFQ = rfqs.find(r => r.pr?.id === pr.id || r.prId === pr.id);

                                            return (
                                                <button
                                                    key={pr.id}
                                                    onClick={() => {
                                                        setForm(f => ({ ...f, prId: pr.id }));
                                                        setSelectedPR(pr);
                                                    }}
                                                    className={`text-left w-full rounded-xl border-2 p-4 transition-all ${isSelected
                                                        ? 'border-violet-500 bg-violet-50'
                                                        : 'border-gray-100 hover:border-violet-200 hover:bg-gray-50'
                                                        }`}
                                                >
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-black text-gray-900 text-sm">{pr.prNumber}</span>
                                                                <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">APPROVED</span>
                                                                {existingRFQ && (
                                                                    <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">
                                                                        RFQ: {existingRFQ.rfqNumber}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-600 mt-1 line-clamp-2">{pr.description}</p>
                                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <Building2 size={11} /> {pr.department?.name || '—'}
                                                                </span>
                                                                <span className="text-xs font-bold text-indigo-700 flex items-center gap-1">
                                                                    <IndianRupee size={11} /> {fmtCur(pr.totalValue)}
                                                                </span>
                                                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Calendar size={11} /> {fmtDate(pr.prDate)}
                                                                </span>
                                                                {lineItems.length > 0 && (
                                                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                                                        <Package size={11} /> {lineItems.length} item(s)
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {isSelected && <CheckCircle size={18} className="text-violet-500 flex-shrink-0 mt-0.5" />}
                                                    </div>

                                                    {/* Line items preview */}
                                                    {isSelected && lineItems.length > 0 && (
                                                        <div className="mt-3 border-t border-violet-100 pt-2 space-y-1">
                                                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest">PR Line Items (will be sent to vendors)</p>
                                                            {lineItems.slice(0, 4).map((item, i) => (
                                                                <div key={i} className="flex justify-between text-xs text-gray-600">
                                                                    <span className="truncate">{item.description || item.sNo}</span>
                                                                    {item.estValue && <span className="font-semibold text-gray-500 ml-2 flex-shrink-0">{fmtCur(item.estValue)}</span>}
                                                                </div>
                                                            ))}
                                                            {lineItems.length > 4 && <p className="text-[10px] text-gray-400">+{lineItems.length - 4} more items</p>}
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* ── STEP 2: RFQ details ── */}
                            <div className={`space-y-4 transition-opacity ${!form.prId ? 'opacity-40 pointer-events-none' : ''}`}>
                                <div className="h-px bg-gray-100" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Step 2 — RFQ Details</p>

                                <div>
                                    <Label>RFQ Title / Subject *</Label>
                                    <Input
                                        placeholder="e.g. Supply of Diesel Generator Sets — 500 KVA"
                                        value={form.title}
                                        onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">This will be the subject line of the email sent to vendors.</p>
                                </div>

                                <div>
                                    <Label>RFQ Description / Scope</Label>
                                    <textarea
                                        rows={2}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none resize-none focus:border-violet-400 transition-colors"
                                        placeholder="Any special requirements, site conditions, delivery instructions, quality standards..."
                                        value={form.description}
                                        onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                                    />
                                </div>

                                <div>
                                    <Label>Quotation Closing Date *</Label>
                                    <Input
                                        type="date"
                                        value={form.deadline}
                                        onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                                        min={new Date().toISOString().slice(0, 10)}
                                    />
                                    <p className="text-[10px] text-gray-400 mt-1">Vendors must submit their quotation before this date.</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={handleCreate}
                                    disabled={creating || !form.prId || !form.title || !form.deadline}
                                    className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {creating ? (
                                        <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating...</>
                                    ) : (
                                        <><Plus size={14} /> Create RFQ (save as Draft)</>
                                    )}
                                </button>
                                <button
                                    onClick={() => { setShowCreate(false); setForm({ prId: '', title: '', description: '', deadline: '' }); setSelectedPR(null); }}
                                    className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* ════════════════════════════════════════════════════
                RFQ DETAIL + SEND MODAL
                ════════════════════════════════════════════════════ */}
            {detailRFQ && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4 overflow-hidden">

                        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-5 flex justify-between items-start">
                            <div>
                                <p className="text-violet-200 text-xs font-bold uppercase tracking-widest">RFQ Detail</p>
                                <h3 className="text-white font-black text-lg">{detailRFQ.rfqNumber}</h3>
                                <p className="text-violet-100 text-sm">{detailRFQ.title}</p>
                            </div>
                            <button onClick={() => { setDetailRFQ(null); setSendVendors([]); }} className="text-white/70 hover:text-white mt-1">
                                <XCircle size={22} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Info grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {[
                                    { label: 'PR Reference', val: detailRFQ.pr?.prNumber || '—' },
                                    { label: 'PR Description', val: detailRFQ.pr?.description?.slice(0, 40) || '—' },
                                    { label: 'PR Value', val: fmtCur(detailRFQ.pr?.totalValue) },
                                    { label: 'Closing Date', val: fmtDate(detailRFQ.deadline) },
                                    { label: 'Status', val: STATUS[detailRFQ.status]?.label || detailRFQ.status },
                                    { label: 'Vendors Invited', val: `${detailRFQ.rfqVendors?.length || 0} vendor(s)` },
                                ].map(f => (
                                    <div key={f.label} className="bg-gray-50 rounded-xl p-3">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{f.label}</p>
                                        <p className="text-sm font-bold text-gray-800 mt-0.5">{f.val}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Vendor invitation status */}
                            {detailRFQ.rfqVendors?.length > 0 && (
                                <div>
                                    <Label>Vendor Status</Label>
                                    <div className="space-y-1.5">
                                        {detailRFQ.rfqVendors.map(rv => (
                                            <div key={rv.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-xl">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{rv.vendor?.name}</p>
                                                    <p className="text-xs text-gray-400">{rv.vendor?.email}</p>
                                                </div>
                                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${rv.status === 'RESPONDED' ? 'bg-emerald-100 text-emerald-700' :
                                                    rv.status === 'SENT' ? 'bg-amber-100 text-amber-700' :
                                                        'bg-gray-100 text-gray-500'
                                                    }`}>{rv.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Send to (more) vendors */}
                            {detailRFQ.status !== 'CLOSED' && detailRFQ.status !== 'CANCELLED' && (
                                <div>
                                    <Label>Send to Additional Vendors</Label>
                                    {vendors.length === 0 ? (
                                        <p className="text-xs text-gray-400">No active vendors. Add vendors in Master Data first.</p>
                                    ) : (
                                        <>
                                            <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-44 overflow-y-auto">
                                                {vendors.filter(v => v.isActive).map(v => {
                                                    const alreadySent = detailRFQ.rfqVendors?.some(rv => rv.vendorId === v.id || rv.vendor?.id === v.id);
                                                    return (
                                                        <label key={v.id} className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${alreadySent ? 'opacity-50 bg-gray-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                                                            <input
                                                                type="checkbox"
                                                                disabled={alreadySent}
                                                                checked={sendVendors.includes(v.id)}
                                                                onChange={e => setSendVendors(e.target.checked ? [...sendVendors, v.id] : sendVendors.filter(x => x !== v.id))}
                                                                className="rounded accent-violet-600"
                                                            />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-gray-900">{v.name}</p>
                                                                <p className="text-xs text-gray-400 truncate">{v.email} · {v.category}</p>
                                                            </div>
                                                            {alreadySent && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Invited</span>}
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                            <button
                                                onClick={() => handleSend(detailRFQ.id)}
                                                disabled={sending || !sendVendors.length}
                                                className="mt-3 w-full bg-violet-600 hover:bg-violet-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Send size={14} />
                                                {sending ? 'Sending emails...' : `Send RFQ to ${sendVendors.length || 0} vendor(s)`}
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}


            {/* ════════════════════════════════════════════════════
                QUOTATION COMPARISON MODAL
                ════════════════════════════════════════════════════ */}
            {compareRFQ && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-4 overflow-hidden">

                        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 flex justify-between items-start">
                            <div>
                                <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Quotation Comparison</p>
                                <h3 className="text-white font-black text-lg">{compareRFQ.rfqNumber} — {compareRFQ.title}</h3>
                                <p className="text-indigo-100 text-xs mt-1">Select the best vendor offer to close this RFQ and proceed to PO</p>
                            </div>
                            <button onClick={() => setCompareRFQ(null)} className="text-white/70 hover:text-white mt-1"><XCircle size={22} /></button>
                        </div>

                        <div className="p-6 overflow-x-auto">
                            {(!compareRFQ.rfqVendors || compareRFQ.rfqVendors.filter(v => v.quotation).length === 0) ? (
                                <div className="text-center py-12">
                                    <Clock size={36} className="mx-auto text-gray-200 mb-3" />
                                    <p className="font-bold text-gray-400">No quotations received yet</p>
                                    <p className="text-xs text-gray-400 mt-1">Vendors will submit their quotations via the email link. Check back after the closing date.</p>
                                </div>
                            ) : (
                                <table className="min-w-full">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            {['Vendor', 'Total Amount', 'Tax', 'Grand Total', 'Delivery', 'Validity', 'Notes', 'Attachments', 'Status', ''].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {compareRFQ.rfqVendors
                                            .filter(rv => rv.quotation)
                                            .sort((a, b) => parseFloat(a.quotation.totalAmount) - parseFloat(b.quotation.totalAmount))
                                            .map((rv, idx) => {
                                                const q = rv.quotation;
                                                const grand = parseFloat(q.totalAmount) + parseFloat(q.taxAmount || 0);
                                                const isLowest = idx === 0;
                                                return (
                                                    <tr key={rv.id} className={`hover:bg-gray-50 transition-colors ${q.status === 'SELECTED' ? 'bg-emerald-50' : ''}`}>
                                                        <td className="px-4 py-3">
                                                            <p className="font-black text-gray-900 text-sm">{rv.vendor?.name}</p>
                                                            <p className="text-xs text-gray-400">{rv.vendor?.email}</p>
                                                        </td>
                                                        <td className="px-4 py-3 font-black text-gray-900 whitespace-nowrap">{fmtCur(q.totalAmount)}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{fmtCur(q.taxAmount)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1">
                                                                <span className="font-black text-indigo-700 whitespace-nowrap">{fmtCur(grand)}</span>
                                                                {isLowest && q.status !== 'REJECTED' && (
                                                                    <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">L1</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{q.deliveryDays ? `${q.deliveryDays} days` : '—'}</td>
                                                        <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{q.validityDays ? `${q.validityDays} days` : '—'}</td>
                                                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[160px]">
                                                            <p className="truncate" title={q.notes}>{q.notes || '—'}</p>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {q.attachments?.length > 0 ? (
                                                                <div className="space-y-1">
                                                                    {q.attachments.map((att, ai) => (
                                                                        <a key={ai}
                                                                            href={`http://localhost:3000/api/${att.path}`}
                                                                            target="_blank" rel="noreferrer"
                                                                            className="flex items-center gap-1 text-[11px] text-violet-600 hover:text-violet-800 hover:underline whitespace-nowrap"
                                                                            title={att.originalName}
                                                                        >
                                                                            📎 {att.originalName?.length > 18 ? att.originalName.slice(0, 15) + '…' : att.originalName}
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            ) : <span className="text-gray-300 text-xs">—</span>}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap ${q.status === 'SELECTED' ? 'bg-emerald-100 text-emerald-700' :
                                                                q.status === 'REJECTED' ? 'bg-red-50 text-red-400' :
                                                                    'bg-blue-50 text-blue-600'
                                                                }`}>{q.status}</span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            {q.status === 'SUBMITTED' && compareRFQ.status !== 'CLOSED' && (
                                                                <button
                                                                    onClick={() => handleSelectVendor(compareRFQ.id, q.id)}
                                                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-lg transition-colors whitespace-nowrap"
                                                                >
                                                                    ✓ Award
                                                                </button>
                                                            )}
                                                            {q.status === 'SELECTED' && <CheckCircle size={18} className="text-emerald-500 ml-auto" />}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RFQManagement;
