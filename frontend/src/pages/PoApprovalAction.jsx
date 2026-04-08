import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { CheckCircle2, XCircle, Clock, ShieldCheck, Mail, ArrowRight, Loader2, FileText, Package, DollarSign, Building } from 'lucide-react';

const statusConfig = {
    APPROVED: { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', label: 'Approved', icon: CheckCircle2 },
    REJECTED: { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', label: 'Rejected', icon: XCircle },
    PENDING: { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', label: 'Pending', icon: Clock },
};

const formatCurrency = (v) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v);

export default function PoApprovalAction() {
    const [params] = useSearchParams();
    const token = params.get('token');
    const defaultDecision = params.get('decision'); 

    const [state, setState] = useState('loading'); // loading | form | done | error | already
    const [data, setData] = useState(null);
    const [decision, setDecision] = useState('');
    const [comments, setComments] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState(null);
    const didFetch = useRef(false);

    useEffect(() => {
        if (!token || didFetch.current) return;
        didFetch.current = true;

        api.get(`/po-approvals/actions/${token}`)
            .then(res => {
                if (res.data.alreadyResponded) {
                    setState('already');
                    setData(res.data);
                } else {
                    setData(res.data);
                    if (defaultDecision === 'approve') setDecision('APPROVED');
                    else if (defaultDecision === 'reject') setDecision('REJECTED');
                    setState('form');
                }
            })
            .catch(() => {
                setState('error');
                setError('This approval link is invalid or has expired.');
            });
    }, [token, defaultDecision]);

    const handleSubmit = async () => {
        if (!decision) return;
        setSubmitting(true);
        setError('');

        try {
            const res = await api.post(`/po-approvals/actions/${token}`, { decision, comments });
            setResult(res.data);
            setState('done');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit decision.');
            setSubmitting(false);
        }
    };

    if (state === 'loading') return <Screen><Spinner /></Screen>;

    if (state === 'error') return (
        <Screen>
            <div className="bg-white rounded-[2rem] p-10 shadow-2xl border border-red-50 text-center max-w-md mx-auto">
                <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center mx-auto mb-6">
                    <XCircle className="text-red-500" size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Link Invalid</h2>
                <p className="text-gray-400 text-sm mb-8">{error}</p>
                <button onClick={() => window.close()} className="w-full py-4 rounded-2xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest">Close Page</button>
            </div>
        </Screen>
    );

    if (state === 'already') return (
        <Screen>
             <div className="bg-white rounded-[2rem] p-10 shadow-2xl border border-gray-100 text-center max-w-md mx-auto">
                <div className={`w-20 h-20 rounded-3xl ${data.status === 'APPROVED' ? 'bg-emerald-50' : 'bg-red-50'} flex items-center justify-center mx-auto mb-6`}>
                    {data.status === 'APPROVED' ? <CheckCircle2 className="text-emerald-500" size={40} /> : <XCircle className="text-red-500" size={40} />}
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Already Responded</h2>
                <p className="text-gray-400 text-sm mb-8">
                    You already {data.status === 'APPROVED' ? 'approved' : 'rejected'} PO <strong>{data.poNumber}</strong>.
                </p>
                <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gray-100 text-gray-600 font-black text-xs uppercase tracking-widest border border-gray-200">
                    Status: {data.status}
                </div>
            </div>
        </Screen>
    );

    if (state === 'done') return (
        <Screen>
             <div className="bg-white rounded-[2rem] p-10 shadow-2xl border border-gray-100 text-center max-w-md mx-auto">
                <div className={`w-20 h-20 rounded-3xl ${result.decision === 'APPROVED' ? 'bg-emerald-100' : 'bg-red-100'} flex items-center justify-center mx-auto mb-6`}>
                    {result.decision === 'APPROVED' ? <CheckCircle2 className="text-emerald-500" size={40} /> : <XCircle className="text-red-500" size={40} />}
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">
                    {result.decision === 'APPROVED' ? 'Purchase Approved!' : 'PO Rejected'}
                </h2>
                <p className="text-gray-400 text-sm mb-10">
                    Your decision has been securely recorded and synced with the procurement ledger.
                </p>
                
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 text-left">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Workflow Update</p>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center">
                            <Activity className="text-blue-500" size={16} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-gray-700">New PO Status</p>
                            <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{result.poStatus}</p>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">You may now close this window</p>
            </div>
        </Screen>
    );

    const { po, approver } = data;

    return (
        <Screen>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10">
                        <ShieldCheck size={280} />
                    </div>
                    <div className="flex items-center gap-3 mb-4 opacity-70">
                        <Package size={16} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Purchase Order Approval</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter mb-2">{po.poNumber}</h1>
                    <p className="text-blue-100/80 font-bold flex items-center gap-2">
                        Authorization required from <span className="underline decoration-blue-400 underline-offset-4">{approver.name}</span>
                    </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-6">
                    <Card title="Vendor" icon={Building}>
                        <p className="text-lg font-black text-gray-800 leading-tight">{po.vendorName}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1 uppercase tracking-wider">Primary Contractor</p>
                    </Card>
                    <Card title="Financial Context" icon={DollarSign}>
                        <p className="text-2xl font-black text-blue-600 tracking-tighter">{formatCurrency(po.totalAmount)}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-0.5 uppercase tracking-wider">Total Value Locked</p>
                    </Card>
                </div>

                {/* Line Items */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-xl p-8">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <FileText size={14} /> Scope of Supply
                    </h3>
                    <div className="space-y-4">
                        {po.lineItems?.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                                <div>
                                    <p className="text-sm font-black text-gray-700">{item.description}</p>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">{item.qty} {item.unit || 'Nos'} @ {formatCurrency(item.unitPrice)}</p>
                                </div>
                                <p className="text-sm font-black text-slate-800">{formatCurrency(item.totalPrice)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Decision Form */}
                <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl p-10">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-8 text-center">Authorization Panel</h3>
                    
                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <button 
                            onClick={() => setDecision('APPROVED')} 
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${decision === 'APPROVED' ? 'border-emerald-500 bg-emerald-50 scale-105 shadow-lg shadow-emerald-100' : 'border-gray-100 hover:border-emerald-200'}`}
                        >
                            <CheckCircle2 size={24} className={decision === 'APPROVED' ? 'text-emerald-600' : 'text-gray-300'} />
                            <span className={`text-xs font-black uppercase tracking-widest ${decision === 'APPROVED' ? 'text-emerald-700' : 'text-gray-400'}`}>Approve</span>
                        </button>
                        <button 
                            onClick={() => setDecision('REJECTED')} 
                            className={`p-6 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${decision === 'REJECTED' ? 'border-red-500 bg-red-50 scale-105 shadow-lg shadow-red-100' : 'border-gray-100 hover:border-red-200'}`}
                        >
                            <XCircle size={24} className={decision === 'REJECTED' ? 'text-red-600' : 'text-gray-300'} />
                            <span className={`text-xs font-black uppercase tracking-widest ${decision === 'REJECTED' ? 'text-red-700' : 'text-gray-400'}`}>Reject</span>
                        </button>
                    </div>

                    <textarea
                        rows={3}
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                        placeholder="Additional remarks or instructions (optional)..."
                        className="w-full rounded-2xl border-2 border-gray-100 p-5 text-sm font-medium outline-none focus:border-blue-300 transition-all resize-none bg-gray-50/30"
                    />

                    {error && <p className="text-red-500 text-xs font-black mt-4 text-center">{error}</p>}

                    <button 
                        onClick={handleSubmit} 
                        disabled={!decision || submitting}
                        className={`w-full mt-8 py-5 rounded-2xl text-white font-black text-sm uppercase tracking-[0.2em] transition-all shadow-xl ${decision === 'APPROVED' ? 'bg-emerald-600 shadow-emerald-100' : decision === 'REJECTED' ? 'bg-red-600 shadow-red-100' : 'bg-gray-200 cursor-not-allowed'}`}
                    >
                        {submitting ? 'Transmitting Data...' : decision ? `Confirm ${decision}` : 'Awaiting Decision'}
                    </button>
                </div>
            </div>
        </Screen>
    );
}

// ---- SUB-COMPONENTS ----
const Screen = ({ children }) => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-3xl">{children}</div>
    </div>
);

const Card = ({ title, icon: Icon, children }) => (
    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-xl">
        <div className="flex items-center gap-2 mb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
            <Icon size={14} /> {title}
        </div>
        {children}
    </div>
);

const Spinner = () => (
    <div className="flex flex-col items-center gap-4">
        <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-100"></div>
            <div className="absolute inset-0 w-16 h-16 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"></div>
        </div>
        <p className="text-sm font-black text-gray-400 uppercase tracking-widest">Securing Connection...</p>
    </div>
);

const Activity = ({ className, size }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width={size} 
        height={size} 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="3" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        className={className}
    >
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
    </svg>
);
