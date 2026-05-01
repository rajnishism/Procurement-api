import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, CheckCircle, XCircle, Package, ChevronRight, AlertCircle, Download, Calendar, Building2, Hash, DollarSign, FileText, Eye, Filter, User, Ship, ExternalLink } from 'lucide-react';
import api from '../api/axios';

const statusColors = {
    DRAFT: { bg: '#f3f4f6', color: '#6b7280', label: 'Draft' },
    ISSUED: { bg: '#dbeafe', color: '#1d4ed8', label: 'Issued' },
    ACKNOWLEDGED: { bg: '#e0e7ff', color: '#4338ca', label: 'Acknowledged' },
    PARTIALLY_DELIVERED: { bg: '#fef3c7', color: '#d97706', label: 'Partial' },
    DELIVERED: { bg: '#d1fae5', color: '#059669', label: 'Delivered' },
    CANCELLED: { bg: '#fee2e2', color: '#dc2626', label: 'Cancelled' },
    CLOSED: { bg: '#f9fafb', color: '#374151', label: 'Closed' },
};

const POManagement = ({ filterStatus: initialFilter = 'ALL' }) => {
    const navigate = useNavigate();
    const [pos, setPOs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState(initialFilter);

    useEffect(() => {
        setFilterStatus(initialFilter);
    }, [initialFilter]);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const poRes = await api.get('/purchase-orders');
            setPOs(poRes.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleViewDetails = (id) => {
        navigate(`/pos/${id}`);
    };

    const formatCurrency = v => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const filteredPOs = pos.filter(po => {
        const matchesSearch = 
            po.poNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.vendor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            po.pr?.prNumber?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'ALL' || po.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const getStatusStyle = (status) => {
        const sc = statusColors[status] || statusColors.DRAFT;
        return { background: sc.bg, color: sc.color };
    };

    return (
        <div className="space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight">
                        {initialFilter === 'ALL' ? 'Purchase Order History' : 'Purchase Order Tracker'}
                    </h2>
                    <p className="text-gray-500 font-medium">
                        {initialFilter === 'ALL' ? 'Complete archive of all procurement orders' : 'Monitoring active supply contracts and delivery status'}
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <button className="flex items-center space-x-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold border border-indigo-100 transition-all">
                        <Download size={18} />
                        <span>Export Excel</span>
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[300px] relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by PO#, Vendor, or PR#..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {initialFilter === 'ALL' && (
                    <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl">
                        {['ALL', 'ISSUED', 'ACKNOWLEDGED', 'DELIVERED', 'CLOSED'].map(status => (
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

            {/* Excel Inspired Table */}
            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1100px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-12 border-r border-gray-200">#</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">PO Number / Vendor</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">Date Issued</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">Linked PR (SR-199)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">WBS Code</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-200">Location</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right border-r border-gray-200">Amount (US$)</th>
                                <th className="px-4 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-32 border-r border-gray-200">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan="9" className="py-20 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <p className="mt-4 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Loading Records...</p>
                                    </td>
                                </tr>
                            ) : filteredPOs.map((po, idx) => (
                                <tr key={po.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-4 text-xs font-bold text-gray-400 text-center border-r border-gray-200">{idx + 1}</td>
                                    <td 
                                        className="px-4 py-4 min-w-[250px] border-r border-gray-200 cursor-pointer group"
                                        onClick={() => handleViewDetails(po.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{po.vendor?.name}</span>
                                                <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded self-start mt-1 uppercase tracking-tight">{po.poNumber}</span>
                                            </div>
                                            <ExternalLink size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0" />
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 border-r border-gray-200">
                                        <div className="flex items-center text-xs font-bold text-gray-600 whitespace-nowrap">
                                            <Calendar size={13} className="mr-1.5 text-gray-400" />
                                            {new Date(po.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 border-r border-gray-200">
                                        <div className="flex items-center gap-2">
                                            <FileText size={13} className="text-gray-400" />
                                            <span className="text-xs font-bold text-gray-700">{po.pr?.prNumber || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 border-r border-gray-200">
                                        <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-lg border border-indigo-100 whitespace-nowrap inline-block shadow-sm">
                                            {po.pr?.wbsCode || 'UNMAPPED'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 border-r border-gray-200">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-gray-700">{po.vendor?.country || 'India'}</span>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Region 1</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right border-r border-gray-200">
                                        <div className="text-sm font-black text-gray-900 whitespace-nowrap">
                                            {formatCurrency(po.totalAmount)}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center border-r border-gray-200">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest inline-block w-28 text-center" style={getStatusStyle(po.status)}>
                                            {po.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right whitespace-nowrap">
                                        <button 
                                            onClick={() => handleViewDetails(po.id)} 
                                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-xl transition-all"
                                            title="View Details"
                                        >
                                            <Eye size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {!loading && filteredPOs.length === 0 && (
                                <tr>
                                    <td colSpan="9" className="py-20 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <Package size={48} className="text-gray-200 mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No PO records found matching filters</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};

export default POManagement;

