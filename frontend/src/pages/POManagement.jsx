import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Package, ChevronRight, AlertCircle } from 'lucide-react';
import api from '../api/axios';

const statusColors = {
    DRAFT: { bg: '#f3f4f6', color: '#6b7280' },
    ISSUED: { bg: '#dbeafe', color: '#1d4ed8' },
    ACKNOWLEDGED: { bg: '#e0e7ff', color: '#4338ca' },
    PARTIALLY_DELIVERED: { bg: '#fef3c7', color: '#d97706' },
    DELIVERED: { bg: '#d1fae5', color: '#059669' },
    CANCELLED: { bg: '#fee2e2', color: '#dc2626' },
    CLOSED: { bg: '#f9fafb', color: '#374151' },
};

const POManagement = ({ filterStatus = 'ALL' }) => {
    const [pos, setPOs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPO, setSelectedPO] = useState(null);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const poRes = await api.get('/purchase-orders');
            setPOs(poRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, [filterStatus]);


    const handleStatus = async (id, action, reason) => {
        try {
            if (action === 'cancel') { await api.patch(`/purchase-orders/${id}/cancel`, { cancelReason: reason }); }
            else { await api.patch(`/purchase-orders/${id}/${action}`); }
            fetchAll();
            setSelectedPO(null);
        } catch (e) { alert(e.response?.data?.error || `Failed to ${action} PO.`); }
    };

    const formatCur = v => `₹${Number(v).toLocaleString('en-IN')}`;
    const formatUSD = v => `$${(Number(v) / 83).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`; // Mock conversion 1 USD = 83 INR
    const filteredPOs = pos.filter(po => filterStatus === 'ALL' || po.status === filterStatus);

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">{filterStatus === 'ALL' ? 'Purchase Order History' : 'Purchase Order Tracker'}</h2>
            </div>

            {filterStatus === 'ALL' ? (
                <div className="grid gap-4">
                    {filteredPOs.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-gray-400 border border-gray-100"><Package size={40} className="mx-auto mb-3 opacity-40" /><p className="font-semibold">No POs yet.</p></div>}
                    {filteredPOs.map(po => {
                        const sc = statusColors[po.status] || statusColors.DRAFT;
                        return (
                            <div key={po.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-center justify-between p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center"><Package size={20} className="text-blue-600" /></div>
                                        <div>
                                            <p className="font-black text-gray-900">{po.poNumber}</p>
                                            <p className="text-sm text-gray-600">{po.vendor?.name}</p>
                                            <p className="text-xs text-gray-400 mt-0.5">PR: {po.pr?.prNumber} · {formatCur(po.totalAmount)}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black px-2 py-1 rounded-full" style={{ background: sc.bg, color: sc.color }}>{po.status}</span>
                                        <button onClick={() => setSelectedPO(po)} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-black flex items-center gap-1 hover:bg-gray-200">
                                            <ChevronRight size={13} /> Manage
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    {['Sr. No', 'PO#', 'Date', 'SR-199', 'WBS', 'Vendor', 'Country', 'Description', 'Amount US$', 'Open/Close'].map(h => (
                                        <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredPOs.map((po, idx) => {
                                    const sc = statusColors[po.status] || statusColors.DRAFT;
                                    return (
                                        <tr key={po.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm font-bold text-gray-400">{idx + 1}</td>
                                            <td className="px-6 py-4 text-sm font-black text-blue-600">{po.poNumber}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">{new Date(po.createdAt).toLocaleDateString('en-IN')}</td>
                                            <td className="px-6 py-4 text-sm font-black text-gray-700">{po.pr?.prNumber || 'N/A'}</td>
                                            <td className="px-6 py-4 text-xs font-mono font-bold text-indigo-600">{po.pr?.wbsCode || 'N/A'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">{po.vendor?.name}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 font-medium">{po.vendor?.country || 'India'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">{po.pr?.title || 'No Description'}</td>
                                            <td className="px-6 py-4 text-sm font-black text-gray-900">{formatUSD(po.totalAmount)}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full" style={{ background: sc.bg, color: sc.color }}>{po.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button onClick={() => setSelectedPO(po)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-blue-600 transition-colors">
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredPOs.length === 0 && (
                                    <tr><td colSpan="11" className="px-6 py-12 text-center text-gray-400 font-medium font-italic">No records found for tracking.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {/* PO Management Panel */}
            {selectedPO && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex justify-between items-start">
                            <div><h3 className="text-white font-black text-lg">{selectedPO.poNumber}</h3><p className="text-blue-100 text-sm">{selectedPO.vendor?.name}</p></div>
                            <button onClick={() => setSelectedPO(null)} className="text-white/70 hover:text-white"><XCircle size={22} /></button>
                        </div>
                        <div className="p-6 space-y-3">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Change Status</p>
                            {selectedPO.status === 'DRAFT' && <button onClick={() => handleStatus(selectedPO.id, 'issue')} className="w-full py-3 bg-blue-600 text-white rounded-xl font-black text-sm hover:bg-blue-700">📤 Issue PO to Vendor</button>}
                            {selectedPO.status === 'ISSUED' && <button onClick={() => handleStatus(selectedPO.id, 'acknowledge')} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700">✅ Mark as Acknowledged</button>}
                            {!['CANCELLED', 'CLOSED', 'DELIVERED'].includes(selectedPO.status) && (
                                <button onClick={() => { const r = prompt('Reason for cancellation?'); if (r) handleStatus(selectedPO.id, 'cancel', r); }} className="w-full py-3 border-2 border-red-200 text-red-600 rounded-xl font-black text-sm hover:bg-red-50">❌ Cancel PO</button>
                            )}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-400 font-semibold">Line Items: {selectedPO.lineItems?.length || 0} · Total: {formatCur(selectedPO.totalAmount)}</p>
                                {selectedPO.expectedDelivery && <p className="text-xs text-gray-400 mt-1">Expected: {new Date(selectedPO.expectedDelivery).toLocaleDateString('en-IN')}</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default POManagement;
