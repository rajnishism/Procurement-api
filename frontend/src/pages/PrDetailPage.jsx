import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    FileText,
    Calendar,
    Clock,
    Building2,
    Hash,
    DollarSign,
    ArrowLeft,
    Download,
    CheckCircle2,
    Clock3,
    XCircle,
    UserCheck,
    AlertCircle,
    Check,
    X,
    Edit3,
    Activity,
    Layers,
    ChevronRight,
    ExternalLink
} from 'lucide-react';
import api from '../api/axios';

const PrDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [pr, setPr] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [approvals, setApprovals] = useState([]);
    const [techSpec, setTechSpec] = useState(null);

    const getQuotationUrl = (relPath) => {
        if (!relPath) return null;
        return `${api.defaults.baseURL}/uploads/${relPath}`;
    };

    const getTemplatePdfUrl = (relPath) => {
        if (!relPath) return null;
        return `${api.defaults.baseURL}/uploads/${relPath}`;
    };

    const getTechSpecUrl = (relPath) => {
        if (!relPath) return null;
        return `${api.defaults.baseURL}/uploads/${relPath}`;
    };

    // WBS Editing State
    const [isEditingWbs, setIsEditingWbs] = useState(false);
    const [tempWbs, setTempWbs] = useState('');
    const [savingWbs, setSavingWbs] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [prRes, techRes] = await Promise.all([
                    api.get(`/prs/${id}`),
                    api.get(`/tech-specs/${id}`).catch(() => ({ data: null }))
                ]);
                setPr(prRes.data);
                console.log(prRes.data);

                setTempWbs(prRes.data.wbsCode || '');
                setApprovals(prRes.data.approvals || []);
                setTechSpec(techRes.data);
            } catch (err) {
                console.error(err);
                setError('Failed to load PR details');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSaveWbs = async () => {
        setSavingWbs(true);
        try {
            await api.patch(`/prs/${id}`, { wbsCode: tempWbs });
            setPr({ ...pr, wbsCode: tempWbs });
            setIsEditingWbs(false);
        } catch (err) {
            alert('Failed to update WBS Code');
        } finally {
            setSavingWbs(false);
        }
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
            case 'PENDING': return 'bg-amber-50 text-amber-700 border-amber-100';
            case 'REJECTED': return 'bg-red-50 text-red-700 border-red-100';
            default: return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest animate-pulse">Retrieving Requisition Data...</p>
            </div>
        );
    }

    if (error || !pr) {
        return (
            <div className="max-w-4xl mx-auto py-12 px-6 text-center">
                <div className="bg-red-50 border border-red-100 rounded-[2rem] p-12">
                    <XCircle size={48} className="text-red-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-black text-gray-800 mb-2">{error || 'PR Not Found'}</h2>
                    <p className="text-gray-500 font-medium mb-8">The requisition you are looking for does not exist or you do not have permission to view it.</p>
                    <button
                        onClick={() => navigate('/prs')}
                        className="bg-gray-800 text-white px-8 py-3 rounded-2xl font-black text-sm hover:bg-gray-900 transition-all shadow-xl shadow-gray-200"
                    >
                        Return to Tracker
                    </button>
                </div>
            </div>
        );
    }

    const lineItems = Array.isArray(pr.lineItems) ? pr.lineItems : (pr.lineItems ? JSON.parse(pr.lineItems) : []);

    // Status Derivation (Fallback Safety)
    const steps = pr.approvalRequest?.steps || [];
    const isActuallyRejected = steps.some(s => s.status === 'REJECTED');
    const isActuallyApproved = steps.length > 0 && steps.every(s => s.status === 'APPROVED');
    const displayStatus = isActuallyRejected ? 'REJECTED' : (isActuallyApproved ? 'APPROVED' : pr.status);

    const roleMapping = {
        INDENTOR: 'Indentor (Confirmation)',
        STAGE1: 'PR Approver (Stage 1)',
        STAGE2: 'Verifier (Stage 2)',
        STAGE3: 'Final Approver (Stage 3)',
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
            {/* Navigation Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigate('/prs')}
                    className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 transition-all group"
                >
                    <div className="p-2 bg-white border border-gray-100 rounded-xl group-hover:border-gray-300 transition-all shadow-sm">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-sm font-black text-inherit uppercase tracking-widest px-2">Back to History</span>
                </button>

                <div className="flex items-center gap-3">
                    <button className="flex items-center space-x-2 bg-white text-gray-700 border border-gray-100 px-5 py-2.5 rounded-xl text-sm font-black hover:bg-gray-50 transition-all shadow-sm">
                        <Download size={18} />
                        <span>Export PDF</span>
                    </button>
                </div>
            </div>

            {/* Main Title Block */}
            <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-20 -mt-20 z-0" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-start md:items-center gap-6">
                        <div className="p-5 bg-blue-600 text-white rounded-[1.5rem] shadow-xl shadow-blue-100 shrink-0">
                            <FileText size={32} />
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-3 mb-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black border uppercase tracking-widest ${getStatusStyle(displayStatus)}`}>
                                    {displayStatus}
                                </span>
                                <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                                    Requisition ID: {pr.id}
                                </span>
                            </div>
                            <h1 className="text-4xl font-black text-gray-900 tracking-tight leading-tight">{pr.prNumber}</h1>
                            <p className="text-xl text-gray-500 font-bold mt-1 max-w-2xl">{pr.description}</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-8 md:border-l md:border-gray-100 md:pl-8 h-fit self-center">
                        <div className="text-left md:text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Estimated Value</p>
                            <p className="text-3xl font-black text-gray-900 leading-none">
                                <span className="text-gray-400 text-xl font-bold mr-1">$</span>
                                {parseFloat(pr.totalValue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Details & Items */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Information Grid */}
                    <div className="bg-white rounded-[2.5rem] p-10 border border-gray-100 shadow-sm">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                            {[
                                { icon: Calendar, label: 'Indent Date', value: pr.prDate ? new Date(pr.prDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—' },
                                { icon: Clock, label: 'Budget Month', value: pr.month && pr.year ? new Date(pr.year, pr.month - 1).toLocaleString('default', { month: 'long', year: 'numeric' }) : '—' },
                                { icon: Building2, label: 'Department', value: pr.department?.name || '—' },
                                { icon: Hash, label: 'WBS Code', value: pr.wbsCode || 'UNASSIGNED', isEditable: true },
                                { icon: UserCheck, label: 'Indentor', value: pr.createdBy?.name || pr.indentor || 'System Generated' },
                                { icon: Activity, label: 'Workflow', value: 'Standard Approval' }
                            ].map(({ icon: Icon, label, value, isEditable }) => (
                                <div key={label} className="space-y-1.5 focus-within:bg-gray-50/50 p-2 rounded-2xl transition-all">
                                    <div className="flex items-center space-x-2">
                                        <Icon size={14} className="text-blue-500" />
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
                                    </div>
                                    {isEditable && isEditingWbs ? (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                autoFocus
                                                value={tempWbs}
                                                onChange={e => setTempWbs(e.target.value)}
                                                className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-sm font-bold text-gray-800 outline-none focus:ring-2 ring-blue-500/20 w-full"
                                                placeholder="Enter WBS..."
                                            />
                                            <div className="flex gap-1">
                                                <button onClick={handleSaveWbs} disabled={savingWbs} className="p-1 bg-blue-600 text-white rounded-lg">
                                                    {savingWbs ? <div className="animate-spin h-3 w-3 border-2 border-white/20 border-t-white" /> : <Check size={14} />}
                                                </button>
                                                <button onClick={() => setIsEditingWbs(false)} className="p-1 bg-gray-200 text-gray-600 rounded-lg">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between group">
                                            <p className={`text-base font-black ${isEditable && !pr.wbsCode ? 'text-amber-600 italic' : 'text-gray-900'} truncate`}>{value}</p>
                                            {isEditable && (
                                                <button onClick={() => setIsEditingWbs(true)} className="p-1 text-gray-300 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-all">
                                                    <Edit3 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                        <div className="px-10 py-7 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                            <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <Layers size={16} className="text-blue-600" />
                                Line Items
                            </h3>
                            <span className="bg-white px-3 py-1 rounded-full border border-gray-100 text-[10px] font-black text-gray-400">{lineItems.length} ITEMS</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-gray-50/80">
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-center border-r border-gray-100 w-12">#</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Description</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Size</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 min-w-[200px]">Specification</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 text-center">UOM</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 text-center">Qty</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">Area</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 text-center">R.O.S</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest border-r border-gray-100">WBS</th>
                                        <th className="px-4 py-3 text-[9px] font-black text-gray-400 uppercase tracking-widest text-right">Est. Value (USD)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {lineItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-blue-50/20 transition-colors align-top">
                                            <td className="px-4 py-4 font-black text-gray-300 text-center border-r border-gray-100">{item.sNo || idx + 1}</td>
                                            <td className="px-4 py-4 font-bold text-gray-800 border-r border-gray-100 max-w-[160px]">
                                                {item.text || item.description || '—'}
                                            </td>
                                            <td className="px-4 py-4 text-gray-600 border-r border-gray-100">{item.size || '—'}</td>
                                            <td className="px-4 py-4 text-gray-500 border-r border-gray-100 whitespace-pre-wrap">{item.specification || '—'}</td>
                                            <td className="px-4 py-4 text-gray-600 border-r border-gray-100 text-center font-bold uppercase">{item.uom || '—'}</td>
                                            <td className="px-4 py-4 text-gray-600 border-r border-gray-100 text-center font-bold">{item.requirement ?? item.quantity ?? '—'}</td>
                                            <td className="px-4 py-4 text-gray-500 border-r border-gray-100">{item.area || '—'}</td>
                                            <td className="px-4 py-4 border-r border-gray-100 text-center">
                                                {item.ros ? (
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${item.ros === 'Immediate' ? 'bg-red-50 text-red-600' :
                                                        item.ros === 'Deferred' ? 'bg-gray-100 text-gray-500' :
                                                            'bg-blue-50 text-blue-600'
                                                        }`}>{item.ros}</span>
                                                ) : '—'}
                                            </td>
                                            <td className="px-4 py-4 text-gray-500 border-r border-gray-100 font-mono text-[10px]">{item.wbs || '—'}</td>
                                            <td className="px-4 py-4 text-right font-black text-gray-800">
                                                {item.value != null
                                                    ? `$${Number(item.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                    : item.estValue != null
                                                        ? `$${Number(item.estValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                                        : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-900 text-white">
                                        <td colSpan={9} className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-right">Grand Total</td>
                                        <td className="px-4 py-3 text-right font-black">
                                            ${lineItems.reduce((acc, item) => acc + (Number(item.value ?? item.estValue) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    {/* Technical Specification Section (Visual representation of TechSpec)
                    {techSpec ? (
                        <div className="bg-emerald-50/30 rounded-[2.5rem] p-10 border border-emerald-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-10 opacity-10">
                                <Activity size={80} className="text-emerald-900" />
                            </div>
                            <h3 className="text-[13px] font-black text-emerald-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <CheckCircle2 size={16} className="text-emerald-600" />
                                Technical Compliance
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <p className="text-sm text-emerald-800 font-medium leading-relaxed bg-white/70 p-5 rounded-2xl border border-emerald-100/50">
                                        {techSpec.notes || 'Technical specifications have been reviewed and approved.'}
                                    </p>
                                    <div className="flex gap-4">
                                        <div className="flex-1 bg-white/70 p-4 rounded-xl border border-emerald-100/50">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Uploaded By</p>
                                            <p className="text-xs font-black text-gray-800">{techSpec.uploadedBy || 'Technical Team'}</p>
                                        </div>
                                        <div className="flex-1 bg-white/70 p-4 rounded-xl border border-emerald-100/50">
                                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1">Review Date</p>
                                            <p className="text-xs font-black text-gray-800">{new Date(techSpec.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-center items-center p-8 bg-emerald-600/5 rounded-3xl border-2 border-emerald-600/10 border-dashed">
                                    <Activity size={32} className="text-emerald-600 mb-3" />
                                    <p className="text-sm font-black text-emerald-800">Compliance score: 100%</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Ready for Procurement</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-amber-50/50 rounded-[2.5rem] p-10 border border-amber-100 border-dashed text-center">
                            <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
                            <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Tech Spec Pending</h4>
                            <p className="text-xs font-bold text-amber-600 mt-1 uppercase tracking-tighter">This requisition is awaiting technical verification clearance.</p>
                        </div>
                    )} */}
                </div>

                {/* Right Column: Approvals & Attachments */}
                <div className="space-y-8">
                    {/* Budget Progress / Allocations */}
                    <div className="bg-gray-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-emerald-400" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Financial Allocation</p>

                        {pr.allocations?.length > 0 ? (
                            <div className="space-y-6">
                                {pr.allocations.map((alloc, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex justify-between items-end mb-2">
                                            <div>
                                                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">{alloc.budgetHead?.name || 'Head'}</p>
                                                <p className="text-xs font-bold text-gray-400">{alloc.budgetHead?.code}</p>
                                            </div>
                                            <p className="text-sm font-black text-white">${parseFloat(alloc.amount).toLocaleString()}</p>
                                        </div>
                                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 rounded-full w-[85%] shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                        </div>
                                        {alloc.isManualOverride && (
                                            <p className="text-[9px] font-black text-amber-400 uppercase flex items-center gap-1 mt-2">
                                                <AlertCircle size={10} /> Manual Allocation Override
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-6 text-center">
                                <p className="text-xs font-bold text-gray-500 italic uppercase">No sub-head allocations defined</p>
                            </div>
                        )}
                    </div>

                    {/* Timeline / Approvals */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm relative">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] flex items-center gap-2">
                                <UserCheck size={16} className="text-blue-600" />
                                Approval Flow
                            </h3>
                            {pr.approvalRequest && (
                                isActuallyApproved ? (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100">
                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Fully Approved</span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100">
                                        <Clock3 size={14} className="text-blue-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">In Approval</span>
                                    </div>
                                )
                            )}
                        </div>

                        {/* Modern in-app ApprovalRequest workflow */}
                        {pr.approvalRequest ? (
                            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-50">
                                {pr.approvalRequest.steps.map((step, idx) => {
                                    const isApproved = step.status === 'APPROVED';
                                    const isRejected = step.status === 'REJECTED';
                                    const isWaiting = step.status === 'WAITING';
                                    return (
                                        <div key={step.id} className="relative pl-8 group">
                                            <div className={`absolute left-0 top-[2px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all ${isApproved ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                                                isRejected ? 'bg-red-500 text-white' :
                                                    isWaiting ? 'bg-gray-200 text-gray-400' :
                                                        'bg-blue-50 text-blue-600 ring-4 ring-white'
                                                }`}>
                                                {isApproved ? <Check size={14} /> : isRejected ? <X size={14} /> : isWaiting ? <Clock3 size={12} /> : <div className="p-1 rounded-full bg-blue-600 animate-pulse" />}
                                            </div>
                                            <div className="flex flex-col">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                            Level {step.level} Approver
                                                        </p>
                                                        <p className="text-sm font-black text-gray-900 leading-tight">
                                                            {step.approver?.name || 'Unassigned'}
                                                        </p>
                                                        <p className="text-[10px] text-gray-400 mt-0.5">{step.approver?.email}</p>
                                                        {step.approver?.designation && (
                                                            <p className="text-[10px] text-gray-400">{step.approver.designation}</p>
                                                        )}
                                                    </div>
                                                    <span className={`text-[9px] font-bold px-2 py-1 rounded-full uppercase tracking-tighter ${isApproved ? 'text-emerald-600 bg-emerald-50' :
                                                        isRejected ? 'text-red-600 bg-red-50' :
                                                            isWaiting ? 'text-gray-500 bg-gray-100' :
                                                                'text-blue-600 bg-blue-50'
                                                        }`}>
                                                        {step.status}
                                                    </span>
                                                </div>
                                                {step.comments && (
                                                    <p className="mt-2 text-xs font-medium text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                                                        "{step.comments}"
                                                    </p>
                                                )}
                                                {step.respondedAt && (
                                                    <p className="mt-1.5 text-[9px] font-bold text-gray-400">
                                                        {new Date(step.respondedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : approvals.length === 0 ? (
                            <div className="text-center py-10 bg-gray-50 rounded-[1.5rem] border border-dashed border-gray-200">
                                <Clock3 size={24} className="text-gray-300 mx-auto mb-2" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Awaiting Submission</p>
                            </div>
                        ) : (
                            // Legacy PrApproval fallback
                            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-50">
                                {approvals
                                    .filter(a => roleMapping[a.role])
                                    .map((approval, idx) => {
                                        const isCompleted = approval.status === 'APPROVED';
                                        const isRejected = approval.status === 'REJECTED';

                                        return (
                                            <div key={idx} className="relative pl-8 group">
                                                <div className={`absolute left-0 top-[2px] w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all ${isCompleted ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' :
                                                    isRejected ? 'bg-red-500 text-white' :
                                                        'bg-blue-50 text-blue-600 ring-4 ring-white'
                                                    }`}>
                                                    {isCompleted ? <Check size={14} /> : isRejected ? <X size={14} /> : <div className="p-1 rounded-full bg-blue-600 animate-pulse" />}
                                                </div>

                                                <div className="flex flex-col">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">
                                                                {roleMapping[approval.role] || approval.role}
                                                            </p>
                                                            <p className="text-sm font-black text-gray-900 leading-tight">
                                                                {approval.approver?.name || 'Pending Assignment'}
                                                            </p>
                                                        </div>
                                                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${isCompleted ? 'text-emerald-600 bg-emerald-50' :
                                                            isRejected ? 'text-red-600 bg-red-50' :
                                                                'text-blue-600 bg-blue-50'
                                                            }`}>
                                                            {approval.status}
                                                        </span>
                                                    </div>
                                                    {approval.comments && (
                                                        <p className="mt-2 text-xs font-medium text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-100 italic">
                                                            "{approval.comments}"
                                                        </p>
                                                    )}
                                                    {approval.respondedAt && (
                                                        <p className="mt-1.5 text-[9px] font-bold text-gray-400">
                                                            {new Date(approval.respondedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        )}
                    </div>

                    {/* Quick Access Documents */}
                    <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transition-transform group-hover:scale-110 duration-500">
                            <Download size={64} />
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] mb-1">Supporting Archive</h4>
                        <p className="text-2xl font-black mb-6">Documents</p>
                        <div className="space-y-3 relative z-10">
                            {pr.pdfPath && (
                                <a
                                    href={getQuotationUrl(pr.pdfPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/20 rounded-lg">
                                            <FileText size={18} className="text-red-200" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-blue-100">Source Quotation</p>
                                            <p className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">{pr.pdfPath}</p>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                </a>
                            )}

                            {pr.templatePdfPath && (
                                <a
                                    href={getTemplatePdfUrl(pr.templatePdfPath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-red-500/20 rounded-lg">
                                            <Layers size={18} className="text-red-200" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-red-100">PR Form (Preview)</p>
                                            <p className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">{pr.templatePdfPath}</p>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                </a>
                            )}

                            {techSpec && techSpec.filePath && (
                                <a
                                    href={getTechSpecUrl(techSpec.filePath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center justify-between bg-white/10 hover:bg-white/20 p-4 rounded-2xl backdrop-blur-md border border-white/10 transition-all group/item"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-500/20 rounded-lg">
                                            <CheckCircle2 size={18} className="text-amber-200" />
                                        </div>
                                        <div className="text-left">
                                            <p className="text-xs font-black uppercase tracking-widest text-amber-100">Technical Spec / BOQ</p>
                                            <p className="text-[10px] font-bold text-white/60 truncate max-w-[150px]">{techSpec.filePath.split('/').pop()}</p>
                                        </div>
                                    </div>
                                    <ExternalLink size={14} className="opacity-50 group-hover/item:opacity-100 transition-opacity" />
                                </a>
                            )}

                            {!pr.pdfPath && !pr.templatePdfPath && (!techSpec || !techSpec.filePath) && (
                                <div className="flex flex-col items-center justify-center p-8 rounded-3xl border border-white/10 border-dashed bg-white/5">
                                    <AlertCircle size={24} className="text-white/20 mb-2" />
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 text-center">No digital attachments found for this requisition</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Vendor Quotations Section */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
                        <h3 className="text-[13px] font-black text-gray-800 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <Building2 size={16} className="text-blue-600" />
                            Vendor Quotations
                        </h3>

                        <div className="space-y-4">
                            {pr.rfqs?.flatMap(rfq => rfq.rfqVendors || []).length > 0 ? (
                                pr.rfqs.flatMap(rfq => rfq.rfqVendors).map((v, i) => (
                                    <div key={i} className="p-4 rounded-2xl border border-gray-50 bg-gray-50/30">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-black text-gray-900">{v.vendor?.name || 'Unknown Vendor'}</p>
                                                <p className="text-[9px] font-bold text-gray-400 uppercase">{v.vendor?.email}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${v.quotation ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'
                                                }`}>
                                                {v.quotation ? 'Submitted' : 'Pending'}
                                            </span>
                                        </div>
                                        {v.quotation?.attachments && (
                                            <div className="mt-3 space-y-2">
                                                {JSON.parse(v.quotation.attachments).map((att, attIdx) => (
                                                    <a
                                                        key={attIdx}
                                                        href={getQuotationUrl(att.filename)}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-2 p-2 rounded-xl bg-white border border-gray-100 hover:border-blue-200 text-[10px] font-black text-blue-600 transition-all"
                                                    >
                                                        <FileText size={12} />
                                                        <span className="truncate">{att.originalName || att.filename}</span>
                                                        <ExternalLink size={10} className="ml-auto opacity-40" />
                                                    </a>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-6">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-relaxed">
                                        No RFQs initiated for this PR yet.
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

export default PrDetailPage;
