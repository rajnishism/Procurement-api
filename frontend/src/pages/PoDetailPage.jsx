import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Download,
    Calendar,
    Building2,
    Hash,
    DollarSign,
    FileText,
    Clock,
    Package,
    User,
    MapPin,
    Truck,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Ship,
    Archive,
    ExternalLink,
    Layers,
    Activity,
    ChevronRight,
    Check,
    X,
    Mail,
    Phone,
    Tag,
    Receipt,
    ClipboardList,
    Zap
} from 'lucide-react';
import api from '../api/axios';

/* ─── Status config ─────────────────────────────────────────────────────────── */
const STATUS = {
    DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', dot: 'bg-gray-400', icon: Clock },
    ISSUED: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500', icon: Ship },
    ACKNOWLEDGED: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500', icon: CheckCircle2 },
    DELIVERED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', icon: Package },
    CANCELLED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', icon: XCircle },
    CLOSED: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-700', dot: 'bg-slate-400', icon: Archive },
};

/* ─── Reusable Info Cell ─────────────────────────────────────────────────────── */
const InfoCell = ({ icon: Icon, label, value, accent = 'text-blue-500' }) => (
    <div className="space-y-1.5 p-2 rounded-2xl hover:bg-gray-50/70 transition-all">
        <div className="flex items-center gap-2">
            <Icon size={13} className={accent} />
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-sm font-black text-gray-900 truncate">{value || '—'}</p>
    </div>
);

/* ─── Component ─────────────────────────────────────────────────────────────── */
const PoDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [po, setPo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const getFileUrl = (relPath) => {
        if (!relPath) return null;
        return `${api.defaults.baseURL}/uploads/${relPath}`;
    };

    const fetchPoDetails = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/purchase-orders/${id}`);
            setPo(res.data);
            setError(null);
        } catch (err) {
            console.error('Error fetching PO details', err);
            setError('Failed to load purchase order details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchPoDetails(); }, [id]);

    const handleAction = async (action) => {
        try {
            if (action === 'cancel') {
                const r = prompt('Reason for cancellation?');
                if (!r) return;
                await api.patch(`/purchase-orders/${id}/cancel`, { cancelReason: r });
            } else {
                await api.patch(`/purchase-orders/${id}/${action}`);
            }
            fetchPoDetails();
        } catch (err) {
            alert(err.response?.data?.error || `Failed to ${action} PO.`);
        }
    };

    /* Loading */
    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Synchronizing PO Data...</p>
        </div>
    );

    /* Error */
    if (error || !po) return (
        <div className="max-w-4xl mx-auto py-12 px-6 text-center">
            <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12">
                <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                <h2 className="text-2xl font-black text-gray-800 mb-2">{error || 'PO Not Found'}</h2>
                <p className="text-gray-500 font-medium mb-8">The purchase order you are looking for does not exist or you do not have permission to view it.</p>
                <button
                    onClick={() => navigate('/purchase-orders')}
                    className="bg-gray-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-gray-900 transition-all shadow-xl shadow-gray-200"
                >
                    Return to PO Management
                </button>
            </div>
        </div>
    );

    const statusCfg = STATUS[po.status] || STATUS.DRAFT;
    const StatusIcon = statusCfg.icon;
    const grandTotal = Number(po.totalAmount || 0);
    const hasDocuments = po.templatePdfPath || po.excelPath;

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

            {/* ── Navigation Bar ───────────────────────────────────────────── */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/pos')}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-all group"
                >
                    <div className="p-2 bg-white border border-gray-100 rounded-xl group-hover:border-gray-300 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-sm font-black text-inherit uppercase tracking-widest px-2">Back to PO Management</span>
                </button>

                <div className="flex items-center gap-3">
                    {po.status !== 'CANCELLED' && po.status !== 'CLOSED' && (
                        <button
                            onClick={() => handleAction('cancel')}
                            className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-100 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-red-100 transition-all shadow-sm"
                        >
                            <XCircle size={16} />
                            <span>Void Order</span>
                        </button>
                    )}
                    <button className="flex items-center gap-2 bg-white text-gray-700 border border-gray-100 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-gray-50 transition-all shadow-sm">
                        <Archive size={16} />
                        <span>Archive</span>
                    </button>
                </div>
            </div>

            {/* ── Hero Title Block ──────────────────────────────────────────── */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                {/* Background decor */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-blue-50/40 rounded-full blur-3xl -mr-24 -mt-24 z-0" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-50/30 rounded-full blur-3xl -ml-16 -mb-16 z-0" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-100 shrink-0">
                            <ClipboardList size={32} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                                    {po.status}
                                </span>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    PO ID: {po.id?.substring(0, 8)}...
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">{po.poNumber}</h1>
                            <p className="text-base text-gray-500 font-bold mt-1">{po.vendor?.name || 'Vendor not assigned'}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 md:border-l md:border-gray-100 md:pl-8 h-fit self-center">
                        <div className="text-left md:text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Order Value</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">
                                <span className="text-gray-400 text-xl font-bold mr-1">₹</span>
                                {grandTotal.toLocaleString('en-IN')}
                            </p>
                            {po.taxAmount > 0 && (
                                <p className="text-[10px] font-bold text-gray-400 mt-1">+ ₹{Number(po.taxAmount).toLocaleString('en-IN')} tax</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Main Grid ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ── LEFT COLUMN ─────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Info Grid Card */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                            <InfoCell icon={Calendar} label="PO Date" value={po.createdAt ? new Date(po.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : null} />
                            <InfoCell icon={Truck} label="Expected Delivery" value={po.expectedDelivery ? new Date(po.expectedDelivery).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'TBD'} />
                            <InfoCell icon={Hash} label="PR Reference" value={po.pr?.prNumber} />
                            <InfoCell icon={Tag} label="Quotation Ref" value={po.quotationId || 'N/A'} accent="text-indigo-500" />
                            <InfoCell icon={Receipt} label="Tax Amount" value={po.taxAmount > 0 ? `₹${Number(po.taxAmount).toLocaleString('en-IN')}` : 'Nil'} accent="text-amber-500" />
                            <InfoCell icon={Activity} label="Workflow" value="Standard Procurement" accent="text-emerald-500" />
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-10 py-7 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers size={16} className="text-blue-600" />
                                Order Line Items
                            </h3>
                            <span className="bg-white px-3 py-1 rounded-full border border-gray-100 text-[10px] font-black text-gray-400">
                                {po.lineItems?.length || 0} POSITIONS
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[600px]">
                                <thead>
                                    <tr className="bg-gray-50/50">
                                        <th className="px-10 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center w-16 border-r border-gray-100">#</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Description</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100">Qty</th>
                                        <th className="px-6 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right border-r border-gray-100">Unit Price</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {po.lineItems?.length > 0 ? po.lineItems.map((item, idx) => (
                                        <tr key={item.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-10 py-5 text-sm font-black text-gray-300 text-center border-r border-gray-100">{idx + 1}</td>
                                            <td className="px-8 py-5 border-r border-gray-100">
                                                <p className="text-sm font-bold text-gray-800 leading-relaxed">{item.description}</p>
                                                {item.uom && (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-100/50 px-2 py-0.5 rounded mt-1.5 inline-block">
                                                        UOM: {item.uom}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-center font-black text-gray-500 text-sm border-r border-gray-100">
                                                {item.quantity} {item.uom || 'Nos'}
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-gray-600 text-sm border-r border-gray-100">
                                                ₹{Number(item.price || 0).toLocaleString('en-IN')}
                                            </td>
                                            <td className="px-8 py-5 text-right font-black text-blue-600 text-sm">
                                                ₹{(Number(item.quantity || 0) * Number(item.price || 0)).toLocaleString('en-IN')}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-10 py-12 text-center">
                                                <Package size={32} className="text-gray-200 mx-auto mb-2" />
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No line items recorded</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Grand Total Footer */}
                        <div className="px-10 py-6 bg-gray-50/50 border-t border-gray-100 flex justify-end">
                            <div className="text-right">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Grand Total</p>
                                <p className="text-3xl font-black text-gray-900 tracking-tighter">
                                    ₹{grandTotal.toLocaleString('en-IN')}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Linked PR Card */}
                    {po.pr && (
                        <div className="bg-indigo-50/40 rounded-[2.5rem] p-8 border border-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                                <FileText size={80} className="text-indigo-900" />
                            </div>
                            <h3 className="text-[13px] font-black text-indigo-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <ClipboardList size={16} className="text-indigo-600" />
                                Linked Requisition
                            </h3>
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-2xl font-black text-gray-900">{po.pr.prNumber}</p>
                                    <p className="text-xs font-bold text-indigo-600">{po.pr.description?.substring(0, 80)}</p>
                                </div>
                                <Link
                                    to={`/prs/${po.pr.id}`}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-600 rounded-2xl font-black text-xs uppercase tracking-widest border border-blue-100 hover:bg-blue-50 transition-all shadow-sm"
                                >
                                    View PR <ExternalLink size={14} />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT COLUMN ────────────────────────────────────────── */}
                <div className="space-y-8">

                    {/* Financial Commitment Dark Card */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Financial Commitment</p>

                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subtotal</span>
                                <span className="text-sm font-black text-white">₹{grandTotal.toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center py-3 border-b border-gray-800">
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Tax</span>
                                <span className="text-sm font-black text-white">₹{Number(po.taxAmount || 0).toLocaleString('en-IN')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-xs font-black text-blue-400 uppercase tracking-widest">Total Value</span>
                                <span className="text-2xl font-black text-white">₹{(grandTotal + Number(po.taxAmount || 0)).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="mt-6 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full w-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                        </div>
                        <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mt-2">Committed Budget</p>
                    </div>

                    {/* Vendor Master Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Building2 size={16} className="text-amber-500" />
                            Vendor Master
                        </h3>

                        <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-3xl border border-amber-100 shadow-sm relative overflow-hidden group mb-5">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/40 rounded-full -mr-12 -mt-12 group-hover:scale-110 transition-transform" />
                            <p className="text-sm font-black text-amber-900 mb-0.5 relative z-10">{po.vendor?.name || 'Unknown Vendor'}</p>
                            <p className="text-[10px] font-bold text-amber-700/70 uppercase tracking-widest relative z-10">Registered Supplier</p>
                        </div>

                        <div className="space-y-4">
                            {po.vendor?.email && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-xl shrink-0"><Mail size={14} /></div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                                        <p className="text-xs font-bold truncate">{po.vendor.email}</p>
                                    </div>
                                </div>
                            )}
                            {po.vendor?.phone && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-xl shrink-0"><Phone size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                                        <p className="text-xs font-bold">{po.vendor.phone}</p>
                                    </div>
                                </div>
                            )}
                            {po.vendor?.address && (
                                <div className="flex items-start gap-3 text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-xl shrink-0 mt-0.5"><MapPin size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Address</p>
                                        <p className="text-xs font-bold leading-relaxed">{po.vendor.address}</p>
                                    </div>
                                </div>
                            )}
                            {po.vendor?.gstin && (
                                <div className="flex items-center gap-3 text-gray-600">
                                    <div className="p-2 bg-gray-50 rounded-xl shrink-0"><Hash size={14} /></div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">GSTIN</p>
                                        <p className="text-xs font-bold font-mono">{po.vendor.gstin}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Workflow Actions Card */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Zap size={16} className="text-emerald-500" />
                            Next Steps
                        </h3>
                        <div className="space-y-3">
                            {po.status === 'DRAFT' && (
                                <button
                                    onClick={() => handleAction('issue')}
                                    className="w-full flex items-center justify-between p-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 active:scale-95"
                                >
                                    Issue to Vendor
                                    <Ship size={18} />
                                </button>
                            )}
                            {po.status === 'ISSUED' && (
                                <button
                                    onClick={() => handleAction('acknowledge')}
                                    className="w-full flex items-center justify-between p-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                                >
                                    Acknowledge Receipt
                                    <CheckCircle2 size={18} />
                                </button>
                            )}
                            {po.status === 'ACKNOWLEDGED' && (
                                <button
                                    onClick={() => handleAction('deliver')}
                                    className="w-full flex items-center justify-between p-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                                >
                                    Mark Delivered
                                    <Package size={18} />
                                </button>
                            )}
                            {!['CANCELLED', 'CLOSED', 'DELIVERED'].includes(po.status) && (
                                <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest text-center pt-1">
                                    Current: {po.status} → {po.status === 'DRAFT' ? 'ISSUED' : po.status === 'ISSUED' ? 'ACKNOWLEDGED' : 'DELIVERED'}
                                </p>
                            )}
                            {(po.status === 'CANCELLED' || po.status === 'DELIVERED' || po.status === 'CLOSED') && (
                                <div className="text-center py-6 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <CheckCircle2 size={24} className="text-gray-300 mx-auto mb-2" />
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">No further actions required</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Documents Archive — blue card */}
                    <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transition-transform group-hover:scale-110 duration-500">
                            <Download size={64} />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">Supporting Archive</h4>
                        <p className="text-2xl font-black mb-6">Documents</p>

                        <div className="space-y-3 relative z-10">
                            {po.templatePdfPath ? (
                                <a
                                    href={getFileUrl(po.templatePdfPath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/20 rounded-lg">
                                            <FileText size={18} className="text-red-200" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-100">PO Preview (PDF)</p>
                                            <p className="text-[10px] font-bold text-white/60 truncate max-w-[160px]">{po.templatePdfPath}</p>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                </a>
                            ) : (
                                <div className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 border-dashed opacity-50 cursor-not-allowed">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/10 rounded-lg"><FileText size={18} className="text-white/40" /></div>
                                        <p className="text-xs font-black uppercase tracking-widest text-white/40">PDF Preview Unavailable</p>
                                    </div>
                                </div>
                            )}

                            {po.excelPath && (
                                <a
                                    href={getFileUrl(po.excelPath)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                                            <Layers size={18} className="text-emerald-200" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-emerald-100">Source Excel</p>
                                            <p className="text-[10px] font-bold text-white/60 truncate max-w-[160px]">{po.excelPath}</p>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                </a>
                            )}

                            {!hasDocuments && (
                                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 border-dashed bg-white/5">
                                    <AlertCircle size={24} className="text-white/20 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">
                                        No digital attachments found for this order
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default PoDetailPage;
