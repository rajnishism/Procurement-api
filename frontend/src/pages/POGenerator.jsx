import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, Trash2, Download, Building, MapPin, FileText, Package, DollarSign, ClipboardList, ClipboardCheck, Mail, ShieldCheck, ArrowRight, CheckCircle2, Loader2, X, Activity } from 'lucide-react';
import api from '../api/axios';

// ── COMPONENTS DEFINED OUTSIDE ─────────────────────────────────────────────
const SectionHeader = ({ icon: Icon, title }) => (
    <div className="flex items-center gap-2 mb-4 mt-6">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
            <Icon size={16} className="text-blue-600" />
        </div>
        <h3 className="text-sm font-black text-gray-700 uppercase tracking-wider">{title}</h3>
    </div>
);

const InputField = ({ label, value, onChange, type = 'text', placeholder = '' }) => (
    <div>
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</label>
        <div className="relative">
            <input 
                type={type} 
                value={value} 
                onChange={onChange} 
                placeholder={placeholder}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-400 transition-colors" 
            />
        </div>
    </div>
);

// 🛡️ WORKFLOW MODAL COMPONENT
const WorkflowModal = ({ isOpen, onClose, onConfirm, data }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                <div className="p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                            <ShieldCheck className="text-white" size={24} />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                    </div>
                    
                    <h2 className="text-2xl font-black text-gray-800 mb-2">Initiate PO Workflow?</h2>
                    <p className="text-gray-500 text-sm mb-8">You are about to generate a Purchase Order and initiate the statutory approval process.</p>

                    <div className="space-y-4 mb-8">
                        {/* Visual Path */}
                        {[
                            { title: 'Budget Commitment', desc: `₹${Number(data.total_amount).toLocaleString('en-IN')} will be locked`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                            { title: 'Approval Request', desc: `Notification sent to ${data.approver_email}`, icon: Mail, color: 'text-blue-600', bg: 'bg-blue-50' },
                            { title: 'Tracking Log', desc: 'Entry created in PO History (Pending)', icon: ClipboardList, color: 'text-purple-600', bg: 'bg-purple-50' },
                        ].map((step, idx) => (
                            <div key={idx} className="flex gap-4 items-center group">
                                <div className={`w-10 h-10 rounded-xl ${step.bg} flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                                    <step.icon size={18} className={step.color} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-xs font-black text-gray-700 uppercase tracking-wider">{step.title}</h4>
                                    <p className="text-[11px] text-gray-400 font-bold">{step.desc}</p>
                                </div>
                                {idx < 2 && <ArrowRight size={14} className="text-gray-200 ml-auto" />}
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="flex-1 py-4 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest transition-all">
                            Cancel
                        </button>
                        <button onClick={onConfirm} className="flex-[2] py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200">
                            Confirm & Initiate
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// 🎉 SUCCESS MODAL COMPONENT
const SuccessModal = ({ isOpen, onClose, poNumber }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-gray-100 text-center p-10">
                <div className="w-20 h-20 rounded-3xl bg-emerald-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
                    <CheckCircle2 className="text-emerald-500" size={40} />
                </div>
                <h2 className="text-2xl font-black text-gray-800 mb-2">Workflow Initiated!</h2>
                <p className="text-gray-400 text-sm mb-8 italic">"{poNumber} has been successfully saved to history and sent for verification."</p>
                
                <div className="bg-gray-50 rounded-2xl p-4 mb-8 text-left border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 text-center">Next Steps</p>
                    <ul className="space-y-3">
                        <li className="flex items-center gap-3 text-[11px] font-black text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center text-white text-[9px]">1</div>
                            Wait for MD Approval via Email
                        </li>
                        <li className="flex items-center gap-3 text-[11px] font-black text-gray-600">
                            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px]">2</div>
                            Check PO History for real-time status
                        </li>
                    </ul>
                </div>

                <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200">
                    Dismiss
                </button>
            </div>
        </div>
    );
};

const POGenerator = () => {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [vendors, setVendors] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [existingPOs, setExistingPOs] = useState([]);
    const [existingPRs, setExistingPRs] = useState([]);
    const [mode, setMode] = useState('manual');
    const [selectedPOId, setSelectedPOId] = useState('');
    const [selectedPRId, setSelectedPRId] = useState('');
    const [approvers, setApprovers] = useState([]);
    const [selectedApprovers, setSelectedApprovers] = useState([]);
    const [savedPoId, setSavedPoId] = useState('');
    const [approvalStep, setApprovalStep] = useState(false);
    const [isSuccessOpen, setIsSuccessOpen] = useState(false);

    const defaultForm = {
        po_number: '',
        po_date: new Date().toISOString().split('T')[0],
        vendor_details: '',
        shipping_address: 'Mine Site / As per contract',
        quotation_reference: '',
        quotation_date: '',
        pr_number: '',
        price_basis: 'FOR Site',
        payment_terms: '30 days after invoice',
        delivery_date: '',
        po_items: [{ description: '', unit: 'Nos', quantity: 1, rate: 0 }],
        total_amount: 0,
        signature: 'Authorized Signatory',
    };

    const [form, setForm] = useState(defaultForm);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [vendorRes, deptRes, poRes, prRes, appRes] = await Promise.all([
                    api.get('/master-data/vendors').catch(() => ({ data: [] })),
                    api.get('/master-data/departments').catch(() => ({ data: [] })),
                    api.get('/purchase-orders').catch(() => ({ data: [] })),
                    api.get('/prs').catch(() => ({ data: [] })),
                    api.get('/master-data/approvers').catch(() => ({ data: [] }))
                ]);
                setVendors(vendorRes.data);
                setDepartments(deptRes.data);
                setExistingPOs(poRes.data);
                setExistingPRs(Array.isArray(prRes.data) ? prRes.data.filter(pr => pr.status === 'APPROVED') : []);
                setApprovers(appRes.data);
            } catch (e) { console.error(e); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const total = form.po_items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
        setForm(prev => ({ ...prev, total_amount: total }));
    }, [form.po_items]);

    const handleVendorSelect = (vendorId) => {
        const vendor = vendors.find(v => v.id === vendorId);
        if (vendor) {
            setForm(prev => ({ 
                ...prev, 
                vendor_id: vendor.id,
                vendor_details: `${vendor.name}\n${vendor.address || ''}\nEmail: ${vendor.email || ''}\nPhone: ${vendor.phone || ''}`.trim()
            }));
        }
    };

    const handlePRSelect = async (prId) => {
        setSelectedPRId(prId);
        if (!prId) return;
        try {
            const res = await api.get(`/prs/${prId}`);
            const pr = res.data;
            let prItems = pr.lineItems?.map(item => ({
                description: item.description || item.itemDescription || '',
                unit: item.uom || item.unit || 'Nos',
                quantity: Number(item.requirement || item.quantity || item.qty || 1),
                rate: Number(item.value || item.estValue || item.unitPrice || 0),
            })) || [];
            if (prItems.length === 0) prItems = [{ description: pr.description || '', unit: 'Lot', quantity: 1, rate: Number(pr.totalValue || 0) }];
            setForm(prev => ({ ...prev, pr_number: pr.prNumber || '', po_items: prItems, shipping_address: pr.area || prev.shipping_address }));
        } catch (e) { console.error(e); }
    };

    const handleItemChange = (idx, field, value) => {
        const items = [...form.po_items];
        items[idx] = { ...items[idx], [field]: value };
        setForm(prev => ({ ...prev, po_items: items }));
    };

    const addItem = () => setForm(prev => ({ ...prev, po_items: [...prev.po_items, { description: '', unit: 'Nos', quantity: 1, rate: 0 }] }));
    const removeItem = (idx) => { if (form.po_items.length > 1) setForm(prev => ({ ...prev, po_items: prev.po_items.filter((_, i) => i !== idx) })); };

    const handleGenerateClick = async () => {
        if (!form.po_number && mode !== 'from_po') return alert('PO Number is mandatory.');
        setLoading(true);
        try {
            const payload = mode === 'from_po' ? { poId: selectedPOId } : form;
            const res = await api.post('/purchase-orders/generate-excel', payload);
            setSavedPoId(res.data.poId);
            setApprovalStep(true);
        } catch (e) {
            console.error(e);
            alert(e.response?.data?.error || 'Failed to generate Draft PO. Check server logs.');
        } finally {
            setLoading(false);
        }
    };

    const executeWorkflow = async () => {
        if (!savedPoId || selectedApprovers.length === 0) return alert('Select at least one approver.');
        setLoading(true);
        try {
            await api.post('/po-approvals/send', {
                poId: savedPoId,
                approverIds: selectedApprovers
            });
            setIsSuccessOpen(true);
            setApprovalStep(false);
        } catch (e) {
            console.error(e);
            alert('Workflow initiation failed. Check server logs.');
        } finally { setLoading(false); }
    };

    const toggleApprover = (id) => {
        setSelectedApprovers(prev => 
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const renderManualForm = () => (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl space-y-2">
            {mode === 'from_pr' && (
                <>
                    <SectionHeader icon={ClipboardCheck} title="Select Approved PR" />
                    <select value={selectedPRId} onChange={e => handlePRSelect(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:border-blue-400 mb-2">
                        <option value="">— Select a Purchase Requisition —</option>
                        {existingPRs.map(pr => (
                            <option key={pr.id} value={pr.id}>{pr.prNumber} — {pr.description?.substring(0, 50)} — ₹{Number(pr.totalValue || 0).toLocaleString('en-IN')}</option>
                        ))}
                    </select>
                </>
            )}


            <SectionHeader icon={FileText} title="Header Section" />
            <div className="grid grid-cols-2 md:grid-cols-2 gap-6">
                <InputField label="PO Number * (L4)" value={form.po_number} onChange={e => setForm({...form, po_number: e.target.value})} placeholder="PO/2026/XXX" />
                <InputField label="PO Date (K4)" type="date" value={form.po_date} onChange={e => setForm({...form, po_date: e.target.value})} />
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Vendor Details (B9)</label>
                    <textarea value={form.vendor_details} onChange={e => setForm({...form, vendor_details: e.target.value})} rows={5}
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-400 resize-none font-medium" placeholder="Name, Address, TIN..." />
                    <select onChange={e => handleVendorSelect(e.target.value)}
                        className="w-full mt-2 border border-blue-50 rounded-xl px-4 py-2 text-[10px] font-black text-blue-600 outline-none bg-blue-50/50 uppercase tracking-widest">
                        <option value="">— Use Vendor Bank —</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Shipping Address (I9)</label>
                    <textarea value={form.shipping_address} onChange={e => setForm({...form, shipping_address: e.target.value})} rows={5}
                        className="w-full border border-gray-200 rounded-2xl px-5 py-4 text-sm outline-none focus:border-blue-400 resize-none font-medium" />
                </div>
            </div>

            <SectionHeader icon={Building} title="Commercial Details" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <InputField label="Quotation Ref (B20)" value={form.quotation_reference} onChange={e => setForm({...form, quotation_reference: e.target.value})} />
                <InputField label="Quotation Date (D20)" type="date" value={form.quotation_date} onChange={e => setForm({...form, quotation_date: e.target.value})} />
                <InputField label="PR Number (F20)" value={form.pr_number} onChange={e => setForm({...form, pr_number: e.target.value})} />
                <InputField label="Price Basis (H20)" value={form.price_basis} onChange={e => setForm({...form, price_basis: e.target.value})} />
                <InputField label="Payment Terms (J20)" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})} />
                <InputField label="Delivery Date (L20)" type="date" value={form.delivery_date} onChange={e => setForm({...form, delivery_date: e.target.value})} />
            </div>

            <SectionHeader icon={ClipboardList} title="Scope & Financials (Starts B22)" />
            <div className="overflow-x-auto rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse bg-white">
                    <thead>
                        <tr className="bg-gray-50/50">
                            {['#', 'Description', 'Unit', 'Qty', 'Rate', 'Total', ''].map(h => (
                                <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {form.po_items.map((item, idx) => (
                            <tr key={idx} className="border-t border-gray-50/50 group">
                                <td className="px-5 py-4 text-sm font-black text-gray-300">{idx + 1}</td>
                                <td className="px-5 py-4"><input value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full border-none px-0 py-0 text-sm font-bold text-gray-700 outline-none focus:ring-0 min-w-[200px]" placeholder="Item name..." /></td>
                                <td className="px-5 py-4"><input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} className="w-16 border border-gray-100 rounded-lg py-1.5 text-center text-xs font-black text-gray-500" /></td>
                                <td className="px-5 py-4"><input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} className="w-16 border border-gray-100 rounded-lg py-1.5 text-center text-xs font-black text-gray-700" /></td>
                                <td className="px-5 py-4"><input type="number" value={item.rate} onChange={e => handleItemChange(idx, 'rate', Number(e.target.value))} className="w-24 border border-gray-100 rounded-lg py-1.5 text-right px-3 text-xs font-black text-emerald-600" /></td>
                                <td className="px-5 py-4 text-sm font-black text-gray-800">₹{(item.quantity * item.rate).toLocaleString('en-IN')}</td>
                                <td className="px-5 py-4">
                                    {form.po_items.length > 1 && <button onClick={() => removeItem(idx)} className="p-2 hover:bg-red-50 text-red-300 hover:text-red-500 rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <button onClick={addItem} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-[10px] font-black uppercase tracking-widest mt-4 ml-2"><Plus size={16} /> Add Position</button>

            <div className="grid grid-cols-2 gap-10 items-end pt-10">
                <InputField label="Signature Text (B33)" value={form.signature} onChange={e => setForm({...form, signature: e.target.value})} />
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign size={80} /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Commercial Total (L34)</p>
                    <h4 className="text-4xl font-black tracking-tighter">₹{form.total_amount.toLocaleString('en-IN')}</h4>
                </div>
            </div>

            <div className="pt-10">
                <button onClick={handleGenerateClick} disabled={loading || !form.po_number}
                    className="w-full py-6 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-[1.5rem] disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-4 group">
                    {loading ? <Loader2 className="animate-spin" /> : <><FileSpreadsheet size={20} className="group-hover:rotate-12 transition-transform" /> Generate & Initiate Workflow</>}
                </button>
            </div>
        </div>
    );

    const renderApprovalPanel = () => (
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-xl space-y-6 animate-in fade-in duration-300">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden group">
                <div className="absolute right-0 top-0 opacity-10 group-hover:scale-110 transition-transform"><ShieldCheck size={200} /></div>
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center"><ShieldCheck size={24} /></div>
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Statutory Master Workflow</h3>
                        <p className="text-[10px] font-black opacity-80 uppercase tracking-widest">Construct Sequential Approval Chain</p>
                    </div>
                </div>
                <p className="text-sm text-blue-100 mb-6 max-w-lg">
                    The PO Draft has been securely generated and buffered on the server. Select your progressive sequence of hierarchical approvers to trigger notifications and initiate lock sequence.
                </p>
            </div>

            <SectionHeader icon={ClipboardList} title="Master Data Approver Registry" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                 {approvers.map(approver => {
                    const isSelected = selectedApprovers.includes(approver.id);
                    const sequenceIndex = selectedApprovers.indexOf(approver.id) + 1;
                    return (
                        <div key={approver.id} onClick={() => toggleApprover(approver.id)}
                            className={`p-5 rounded-2xl border-2 cursor-pointer transition-all ${isSelected ? 'bg-blue-50 border-blue-600 shadow-md shadow-blue-100' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-black text-gray-800 tracking-tight">{approver.name}</span>
                                {isSelected ? (
                                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">{sequenceIndex}</span>
                                ) : (
                                    <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                                )}
                            </div>
                            <p className="text-xs font-bold text-gray-500 truncate">{approver.email}</p>
                            <p className="text-[10px] font-black uppercase text-gray-400 mt-2">{approver.department?.name || 'Cross-Functional'}</p>
                        </div>
                    );
                })}
            </div>

            <div className="pt-10 flex gap-4">
                <button onClick={() => setApprovalStep(false)}
                    className="flex-1 py-5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-sm uppercase tracking-widest rounded-2xl transition-all">
                    Discard & Back
                </button>
                <button onClick={executeWorkflow} disabled={loading || selectedApprovers.length === 0}
                    className="flex-[2] py-5 bg-blue-600 hover:bg-blue-700 text-white font-black text-sm uppercase tracking-widest rounded-2xl disabled:opacity-50 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-4">
                    {loading ? <Loader2 className="animate-spin" /> : 'Initiate Sequential Workflow'}
                </button>
            </div>
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-40">
            <SuccessModal isOpen={isSuccessOpen} onClose={() => { setIsSuccessOpen(false); setForm(defaultForm); setSelectedApprovers([]); setMode('manual'); }} poNumber={form.po_number || selectedPOId} />

            <div className="flex justify-between items-center text-slate-800">
                <div>
                    <h2 className="text-4xl font-black tracking-tight mb-1">PO Station</h2>
                    <div className="flex items-center gap-2 text-slate-400 font-bold text-xs uppercase tracking-widest">
                        <Activity className="text-blue-500" size={14} />
                        <span>Mined Output</span>
                        <ArrowRight size={12} className="opacity-30" />
                        <span>Statutory Validation</span>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 p-6 shadow-sm">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 ml-2">Select Pipeline</p>
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { key: 'manual', label: 'Manual Entry', icon: Plus, desc: 'Fresh Order' },
                        { key: 'from_pr', label: 'From PR', icon: ClipboardList, desc: 'Existing Req' },
                        { key: 'from_po', label: 'Re-Issue', icon: Package, desc: 'History' },
                    ].map(opt => (
                        <button key={opt.key} onClick={() => { setMode(opt.key); setForm(defaultForm); setSelectedPRId(''); setSelectedPOId(''); setSuccess(false); }}
                            className={`p-6 rounded-3xl text-left border transition-all ${mode === opt.key ? 'bg-blue-600 border-blue-500 shadow-xl shadow-blue-200' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}>
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 ${mode === opt.key ? 'bg-white/20' : 'bg-white shadow-sm'}`}>
                                <opt.icon size={20} className={mode === opt.key ? 'text-white' : 'text-blue-600'} />
                            </div>
                            <span className={`text-sm font-black block leading-none mb-1 ${mode === opt.key ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                            <span className={`text-[10px] font-bold block ${mode === opt.key ? 'text-blue-100' : 'text-gray-400'}`}>{opt.desc}</span>
                        </button>
                    ))}
                </div>
            </div>

            {approvalStep ? renderApprovalPanel() : (
                mode === 'from_po' ? (
                    <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm space-y-6">
                        <SectionHeader icon={Package} title="Target History Record" />
                        <select value={selectedPOId} onChange={e => setSelectedPOId(e.target.value)}
                            className="w-full border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold outline-none focus:border-blue-400 bg-gray-50/50">
                            <option value="">— Select from Procurement Logs —</option>
                            {existingPOs.map(po => (
                                <option key={po.id} value={po.id}>{po.poNumber} ⟷ {po.vendor?.name} ⟷ ₹{Number(po.totalAmount).toLocaleString('en-IN')}</option>
                            ))}
                        </select>
                        <button onClick={handleGenerateClick} disabled={loading || !selectedPOId}
                            className="w-full py-5 bg-slate-900 border border-slate-800 hover:bg-black text-white font-black text-xs uppercase tracking-widest rounded-2xl disabled:opacity-50 transition-all shadow-xl shadow-slate-100">
                            {loading ? 'Processing...' : 'Identify & Buffer'}
                        </button>
                    </div>
                ) : renderManualForm()
            )}
        </div>
    );
};

export default POGenerator;
