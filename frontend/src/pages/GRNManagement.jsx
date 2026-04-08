import React, { useState, useEffect } from 'react';
import { Plus, Truck, XCircle } from 'lucide-react';
import api from '../api/axios';

const GRNManagement = () => {
    const [grns, setGrns] = useState([]);
    const [pos, setPOs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [poDetail, setPoDetail] = useState(null);
    const [lineItems, setLineItems] = useState([]);
    const [receivedBy, setReceivedBy] = useState('');
    const [remarks, setRemarks] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [grnRes, poRes] = await Promise.all([api.get('/grns'), api.get('/purchase-orders')]);
            setGrns(grnRes.data);
            setPOs(poRes.data.filter(p => ['ISSUED', 'ACKNOWLEDGED', 'PARTIALLY_DELIVERED'].includes(p.status)));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const onPOChange = async (poId) => {
        setSelectedPO(poId);
        if (!poId) { setPoDetail(null); setLineItems([]); return; }
        try {
            const res = await api.get(`/purchase-orders/${poId}`);
            setPoDetail(res.data);
            setLineItems(res.data.lineItems.map(li => ({
                poLineItemId: li.id,
                description: li.description,
                orderedQty: Number(li.qty),
                receivedQty: Number(li.qty),
                rejectedQty: 0,
                remarks: ''
            })));
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        if (!selectedPO || !lineItems.length) return alert('Select a PO with line items.');
        setCreating(true);
        try {
            await api.post('/grns', { poId: selectedPO, receivedBy, remarks, lineItems });
            setShowCreate(false);
            setSelectedPO(null); setPoDetail(null); setLineItems([]);
            fetchAll();
        } catch (e) { alert(e.response?.data?.error || 'Failed to create GRN.'); }
        finally { setCreating(false); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Goods Received (GRN)</h2>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100">
                    <Plus size={18} className="mr-2" /> New GRN
                </button>
            </div>

            <div className="grid gap-4">
                {grns.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100"><Truck size={40} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No GRNs yet.</p></div>}
                {grns.map(grn => (
                    <div key={grn.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-black text-gray-900">{grn.grnNumber}</p>
                                <p className="text-sm text-gray-500">PO: {grn.po?.poNumber} · {grn.po?.vendor?.name}</p>
                                <p className="text-xs text-gray-400 mt-0.5">Received: {new Date(grn.receivedAt).toLocaleDateString('en-IN')} · {grn.lineItems?.length || 0} items</p>
                            </div>
                            <span className={`text-xs font-black px-3 py-1 rounded-full ${grn.status === 'COMPLETE' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{grn.status}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create GRN Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">
                        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-white font-black text-lg">Create Goods Receipt Note</h3>
                            <button onClick={() => setShowCreate(false)} className="text-white/70 hover:text-white"><XCircle size={22} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Purchase Order *</label>
                                <select className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none" value={selectedPO || ''} onChange={e => onPOChange(e.target.value)}>
                                    <option value="">— Select PO —</option>
                                    {pos.map(p => <option key={p.id} value={p.id}>{p.poNumber} — {p.vendor?.name}</option>)}
                                </select>
                            </div>
                            {lineItems.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Line Items — Enter Received Quantities</p>
                                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50"><tr>
                                                {['Description', 'Ordered', 'Received', 'Rejected', 'Remarks'].map(h => <th key={h} className="px-4 py-2 text-left text-[9px] font-black text-gray-400 uppercase">{h}</th>)}
                                            </tr></thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {lineItems.map((item, i) => (
                                                    <tr key={i}>
                                                        <td className="px-4 py-2 text-xs font-semibold text-gray-700">{item.description}</td>
                                                        <td className="px-4 py-2 text-xs text-gray-500">{item.orderedQty}</td>
                                                        <td className="px-4 py-2"><input type="number" className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none" value={item.receivedQty} onChange={e => { const l = [...lineItems]; l[i].receivedQty = e.target.value; setLineItems(l); }} /></td>
                                                        <td className="px-4 py-2"><input type="number" className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none" value={item.rejectedQty} onChange={e => { const l = [...lineItems]; l[i].rejectedQty = e.target.value; setLineItems(l); }} /></td>
                                                        <td className="px-4 py-2"><input className="w-32 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none" value={item.remarks} onChange={e => { const l = [...lineItems]; l[i].remarks = e.target.value; setLineItems(l); }} /></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Received By</label>
                                    <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={receivedBy} onChange={e => setReceivedBy(e.target.value)} /></div>
                                <div><label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Remarks</label>
                                    <input className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none" value={remarks} onChange={e => setRemarks(e.target.value)} /></div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleCreate} disabled={creating || !selectedPO} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl disabled:opacity-60">{creating ? 'Saving...' : 'Create GRN'}</button>
                                <button onClick={() => setShowCreate(false)} className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GRNManagement;
