import React, { useState, useEffect } from 'react';
import { Plus, CreditCard } from 'lucide-react';
import api from '../api/axios';

const PaymentManagement = () => {
    const [payments, setPayments] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ invoiceId: '', amount: '', paymentDate: '', paymentMode: 'NEFT', referenceNumber: '', remarks: '' });
    const [saving, setSaving] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [payRes, invRes] = await Promise.all([api.get('/payments'), api.get('/invoices')]);
            setPayments(payRes.data);
            setInvoices(invRes.data.filter(i => i.status === 'APPROVED_FOR_PAYMENT'));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const onInvoiceChange = (invId) => {
        setForm(f => ({ ...f, invoiceId: invId }));
        const inv = invoices.find(i => i.id === invId);
        if (inv) setForm(f => ({ ...f, invoiceId: invId, amount: Number(inv.amount).toString() }));
    };

    const handleCreate = async () => {
        if (!form.invoiceId || !form.amount || !form.paymentDate || !form.paymentMode) return alert('Invoice, amount, date and mode required.');
        setSaving(true);
        try {
            await api.post('/payments', form);
            setShowCreate(false);
            setForm({ invoiceId: '', amount: '', paymentDate: '', paymentMode: 'NEFT', referenceNumber: '', remarks: '' });
            fetchAll();
        } catch (e) { alert(e.response?.data?.error || 'Failed to record payment.'); }
        finally { setSaving(false); }
    };

    const formatCur = v => `₹${Number(v).toLocaleString('en-IN')}`;
    const modeColors = { NEFT: '#1d4ed8', RTGS: '#7c3aed', CHEQUE: '#d97706', UPI: '#059669', CASH: '#374151' };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Payment Release</h2>
                {invoices.length > 0 && (
                    <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100">
                        <Plus size={18} className="mr-2" /> Record Payment
                    </button>
                )}
            </div>

            {invoices.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                    <p className="text-amber-800 font-black text-sm">🔔 {invoices.length} invoice(s) approved and awaiting payment</p>
                </div>
            )}

            <div className="grid gap-4">
                {payments.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100"><CreditCard size={40} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No payments recorded yet.</p></div>}
                {payments.map(p => (
                    <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-black text-gray-900">{formatCur(p.amount)}</p>
                                <p className="text-sm text-gray-500">Invoice: {p.invoice?.invoiceNumber} · {p.invoice?.po?.vendor?.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">PO: {p.invoice?.po?.poNumber} · {new Date(p.paymentDate).toLocaleDateString('en-IN')}</p>
                                {p.referenceNumber && <p className="text-xs text-gray-400">Ref: {p.referenceNumber}</p>}
                            </div>
                            <span className="text-xs font-black px-3 py-1 rounded-full text-white" style={{ background: modeColors[p.paymentMode] || '#374151' }}>{p.paymentMode}</span>
                        </div>
                    </div>
                ))}
            </div>

            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 rounded-t-2xl"><h3 className="text-white font-black text-lg">Record Payment</h3></div>
                        <div className="p-6 space-y-3">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Invoice *</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none" value={form.invoiceId} onChange={e => onInvoiceChange(e.target.value)}>
                                    <option value="">— Select Invoice —</option>
                                    {invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} — {i.vendor?.name} — ₹{Number(i.amount).toLocaleString('en-IN')}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Amount (₹) *</label>
                                    <input type="number" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Date *</label>
                                    <input type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={form.paymentDate} onChange={e => setForm({ ...form, paymentDate: e.target.value })} /></div>
                            </div>
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Payment Mode *</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none" value={form.paymentMode} onChange={e => setForm({ ...form, paymentMode: e.target.value })}>
                                    {['NEFT', 'RTGS', 'CHEQUE', 'UPI', 'CASH'].map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </div>
                            {[{ label: 'Reference / UTR Number', key: 'referenceNumber' }, { label: 'Remarks', key: 'remarks' }].map(f => (
                                <div key={f.key}><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</label>
                                    <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} /></div>
                            ))}
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleCreate} disabled={saving} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl disabled:opacity-60">{saving ? 'Saving...' : 'Record Payment & Close PO'}</button>
                                <button onClick={() => setShowCreate(false)} className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentManagement;
