import React, { useState, useEffect } from 'react';
import { Plus, FileCheck, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import api from '../api/axios';

const statusCfg = {
    SUBMITTED: { label: 'Submitted', bg: '#f3f4f6', color: '#6b7280' },
    MATCHED: { label: 'Matched ✅', bg: '#d1fae5', color: '#059669' },
    DISPUTED: { label: 'Disputed ⚠️', bg: '#fee2e2', color: '#dc2626' },
    APPROVED_FOR_PAYMENT: { label: 'Approved 💳', bg: '#dbeafe', color: '#1d4ed8' },
    PAID: { label: 'Paid ✓', bg: '#f0fdf4', color: '#166534' },
};

const InvoiceManagement = () => {
    const [invoices, setInvoices] = useState([]);
    const [pos, setPOs] = useState([]);
    const [grns, setGrns] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selected, setSelected] = useState(null);
    const [matchResult, setMatchResult] = useState(null);
    const [form, setForm] = useState({ vendorId: '', poId: '', grnId: '', amount: '', taxAmount: '', invoiceDate: '', dueDate: '' });
    const [saving, setSaving] = useState(false);
    const [matching, setMatching] = useState(false);
    const [approving, setApproving] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [invRes, poRes, grnRes, vendorRes] = await Promise.all([
                api.get('/invoices'), api.get('/purchase-orders'), api.get('/grns'), api.get('/master-data/vendors')
            ]);
            setInvoices(invRes.data);
            setPOs(poRes.data.filter(p => ['DELIVERED', 'PARTIALLY_DELIVERED'].includes(p.status)));
            setGrns(grnRes.data);
            setVendors(vendorRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleCreate = async () => {
        if (!form.vendorId || !form.poId || !form.amount || !form.invoiceDate) return alert('Vendor, PO, amount and date required.');
        setSaving(true);
        try {
            await api.post('/invoices', form);
            setShowCreate(false);
            setForm({ vendorId: '', poId: '', grnId: '', amount: '', taxAmount: '', invoiceDate: '', dueDate: '' });
            fetchAll();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create invoice.'); }
        finally { setSaving(false); }
    };

    const handleMatch = async () => {
        if (!selected) return;
        setMatching(true);
        try {
            const res = await api.post(`/invoices/${selected.id}/match`, { tolerancePct: 2 });
            setMatchResult(res.data);
            fetchAll();
        } catch (e) { alert(e.response?.data?.error || 'Matching failed.'); }
        finally { setMatching(false); }
    };

    const handleApprove = async () => {
        if (!selected) return;
        setApproving(true);
        try {
            await api.patch(`/invoices/${selected.id}/approve`);
            setSelected(null); setMatchResult(null);
            fetchAll();
        } catch (e) { alert(e.response?.data?.error || 'Failed to approve.'); }
        finally { setApproving(false); }
    };

    const formatCur = v => `₹${Number(v).toLocaleString('en-IN')}`;

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Invoices & 3-Way Match</h2>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100">
                    <Plus size={18} className="mr-2" /> New Invoice
                </button>
            </div>

            <div className="grid gap-4">
                {invoices.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100"><FileCheck size={40} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No invoices yet.</p></div>}
                {invoices.map(inv => {
                    const s = statusCfg[inv.status] || statusCfg.SUBMITTED;
                    return (
                        <div key={inv.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between p-5">
                                <div>
                                    <p className="font-black text-gray-900">{inv.invoiceNumber}</p>
                                    <p className="text-sm text-gray-500">{inv.vendor?.name} · {formatCur(inv.amount)}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">PO: {inv.po?.poNumber} · {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {inv.threeWayMatch && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${inv.threeWayMatch.result === 'MATCHED' ? 'bg-emerald-100 text-emerald-700' : inv.threeWayMatch.result === 'MISMATCH' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700'}`}>
                                            {inv.threeWayMatch.result}
                                        </span>
                                    )}
                                    <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background: s.bg, color: s.color }}>{s.label}</span>
                                    {['SUBMITTED', 'MATCHED', 'DISPUTED'].includes(inv.status) && (
                                        <button onClick={() => { setSelected(inv); setMatchResult(null); }} className="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-black hover:bg-indigo-100">Match / Approve</button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Create Invoice Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 rounded-t-2xl"><h3 className="text-white font-black text-lg">Submit Invoice</h3></div>
                        <div className="p-6 space-y-3">
                            {[{ label: 'Vendor *', key: 'vendorId', options: vendors.map(v => ({ id: v.id, label: v.name })) },
                            { label: 'PO *', key: 'poId', options: pos.map(p => ({ id: p.id, label: `${p.poNumber} — ${p.vendor?.name}` })) },
                            { label: 'GRN (optional)', key: 'grnId', options: grns.map(g => ({ id: g.id, label: `${g.grnNumber} — PO: ${g.po?.poNumber}` })), optional: true },
                            ].map(f => (
                                <div key={f.key}><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</label>
                                    <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}>
                                        <option value="">— Select —</option>
                                        {f.options.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                                    </select>
                                </div>
                            ))}
                            <div className="grid grid-cols-2 gap-3">
                                {[{ label: 'Amount (₹) *', key: 'amount', type: 'number' },
                                { label: 'Tax (₹)', key: 'taxAmount', type: 'number' },
                                { label: 'Invoice Date *', key: 'invoiceDate', type: 'date' },
                                { label: 'Due Date', key: 'dueDate', type: 'date' },
                                ].map(f => (
                                    <div key={f.key}><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</label>
                                        <input type={f.type} className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} /></div>
                                ))}
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleCreate} disabled={saving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl disabled:opacity-60">{saving ? 'Saving...' : 'Submit Invoice'}</button>
                                <button onClick={() => setShowCreate(false)} className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* 3-Way Match Panel */}
            {selected && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 rounded-t-2xl flex justify-between items-start">
                            <div><h3 className="text-white font-black text-lg">{selected.invoiceNumber}</h3><p className="text-indigo-100 text-sm">3-Way Match & Approval</p></div>
                            <button onClick={() => { setSelected(null); setMatchResult(null); }} className="text-white/70 hover:text-white"><XCircle size={22} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 text-sm font-semibold space-y-1">
                                <div className="flex justify-between"><span className="text-gray-400">Invoice Amount</span><span className="font-black">₹{Number(selected.amount).toLocaleString('en-IN')}</span></div>
                                <div className="flex justify-between"><span className="text-gray-400">GRN Linked</span><span>{selected.grnId ? '✅ Yes' : '⚠️ No GRN'}</span></div>
                            </div>
                            {matchResult && (
                                <div className={`rounded-xl p-4 border ${matchResult.match.result === 'MATCHED' ? 'border-emerald-200 bg-emerald-50' : matchResult.match.result === 'MISMATCH' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                                    <p className="font-black text-sm">{matchResult.match.result === 'MATCHED' ? '✅ Matched' : matchResult.match.result === 'MISMATCH' ? '❌ Mismatch' : '⚠️ Partial Match'}</p>
                                    {matchResult.match.discrepancyNotes && <p className="text-xs mt-1 text-gray-700">{matchResult.match.discrepancyNotes}</p>}
                                    <p className="text-xs mt-1 text-gray-500">GRN qty received: {matchResult.match.grnReceivedQtyPct?.toFixed(1)}%</p>
                                </div>
                            )}
                            <button onClick={handleMatch} disabled={matching} className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                                <AlertCircle size={16} />{matching ? 'Running match...' : 'Run 3-Way Match'}
                            </button>
                            {(matchResult?.invoiceStatus === 'MATCHED' || selected.status === 'MATCHED') && (
                                <button onClick={handleApprove} disabled={approving} className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                                    <CheckCircle size={16} />{approving ? 'Approving...' : 'Approve for Payment'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceManagement;
