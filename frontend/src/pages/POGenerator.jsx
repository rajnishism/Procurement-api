import React, { useState, useEffect } from 'react';
import {
    FileSpreadsheet, Plus, Trash2, Building, FileText, Package,
    DollarSign, ClipboardList, ClipboardCheck, Mail, ShieldCheck,
    ArrowRight, CheckCircle2, Loader2, X, Activity, Search, UserCheck
} from 'lucide-react';
import api from '../api/axios';
import { validateFile } from '../utils/fileValidation';

// ── Layout helpers (NFA-style) ─────────────────────────────────────────────────
const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all';

const Section = ({ title, icon, children, action }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-200">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <div className="flex items-center gap-2.5">
                <span className="text-gray-400">{icon}</span>
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>
            </div>
            {action && <div>{action}</div>}
        </div>
        <div className="p-5 space-y-4">{children}</div>
    </div>
);

const Field = ({ label, required, children }) => (
    <div className="space-y-1.5 w-full">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

// ── Workflow Modal ─────────────────────────────────────────────────────────────
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
                        <button onClick={onClose} className="flex-1 py-4 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 text-gray-500 text-xs font-black uppercase tracking-widest transition-all">Cancel</button>
                        <button onClick={onConfirm} className="flex-[2] py-4 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-200">Confirm & Initiate</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Success Modal ──────────────────────────────────────────────────────────────
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
                <button onClick={onClose} className="w-full py-4 rounded-2xl bg-slate-900 hover:bg-black text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-200">Dismiss</button>
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────────
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
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

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

    const handleUserSearch = async (val) => {
        setUserSearchTerm(val);
        if (val.length < 2) { setUserSearchResults([]); return; }
        setIsSearching(true);
        try {
            const res = await api.get(`/auth/search-users?q=${val}`);
            setUserSearchResults(res.data);
        } catch (e) { console.error(e); } finally { setIsSearching(false); }
    };

    const addApproverFromSearch = (user) => {
        if (!selectedApprovers.includes(user.id)) setSelectedApprovers(prev => [...prev, user.id]);
        setUserSearchTerm('');
        setUserSearchResults([]);
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
        } finally { setLoading(false); }
    };

    const executeWorkflow = async () => {
        if (!savedPoId || selectedApprovers.length === 0) return alert('Select at least one approver.');
        setLoading(true);
        try {
            await api.post('/po-approvals/send', { poId: savedPoId, approverIds: selectedApprovers });
            setIsSuccessOpen(true);
            setApprovalStep(false);
        } catch (e) {
            console.error(e);
            alert('Workflow initiation failed. Check server logs.');
        } finally { setLoading(false); }
    };

    const toggleApprover = (id) => {
        setSelectedApprovers(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ── Parse file handler (kept identical) ──────────────────────────────────
    const handleParseFile = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const validationError = validateFile(file, {
            maxSize: 10 * 1024 * 1024,
            allowedTypes: ['.xlsx', '.xls', '.pdf']
        });

        if (validationError) {
            alert(validationError);
            e.target.value = null;
            return;
        }

        const formData = new FormData();
        formData.append('document', file);
        try {
            setLoading(true);
            const res = await api.post('/purchase-orders/parse', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const data = res.data;
            const items = data.items?.length > 0 ? data.items.map(item => ({
                description: item.description || '',
                unit: item.unit || 'Nos',
                quantity: Number(item.qty || item.quantity || 0),
                rate: Number(item.rate || 0)
            })) : defaultForm.po_items;
            const tryFormatDate = (dateStr) => {
                if (!dateStr) return '';
                if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
                try { const d = new Date(dateStr); if (!isNaN(d)) return d.toISOString().split('T')[0]; } catch (_) { }
                return dateStr;
            };
            setForm(prev => ({
                ...prev,
                po_number: data.poNumber || prev.po_number,
                po_date: tryFormatDate(data.date) || prev.po_date,
                vendor_details: data.vendor || prev.vendor_details,
                quotation_reference: data.quotationReference || prev.quotation_reference,
                quotation_date: tryFormatDate(data.quotationDate) || prev.quotation_date,
                pr_number: data.prNumber || prev.pr_number,
                price_basis: data.priceBasis || prev.price_basis,
                payment_terms: data.paymentTerms || prev.payment_terms,
                delivery_date: tryFormatDate(data.deliveryDate) || prev.delivery_date,
                po_items: items,
                total_amount: data.total ? Number(data.total) : prev.total_amount
            }));
            e.target.value = null;
        } catch (error) {
            console.error('Failed to parse file:', error);
            alert('Failed to parse the file. Please check server logs.');
        } finally { setLoading(false); }
    };

    // ── Render: manual / from_pr form ────────────────────────────────────────
    const renderManualForm = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — main fields */}
            <div className="lg:col-span-2 space-y-6">
                {mode === 'from_pr' && (
                    <Section title="Select Approved PR" icon={<ClipboardCheck size={15} />}>
                        <Field label="Purchase Requisition">
                            <select
                                value={selectedPRId}
                                onChange={e => handlePRSelect(e.target.value)}
                                className={inputCls}
                            >
                                <option value="">— Select a Purchase Requisition —</option>
                                {existingPRs.map(pr => (
                                    <option key={pr.id} value={pr.id}>
                                        {pr.prNumber} — {pr.description?.substring(0, 50)} — ₹{Number(pr.totalValue || 0).toLocaleString('en-IN')}
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </Section>
                )}

                <Section title="Header Details" icon={<FileText size={15} />}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="PO Number (L4)" required>
                            <input type="text" value={form.po_number} onChange={e => setForm({ ...form, po_number: e.target.value })} placeholder="PO/2026/XXX" className={inputCls} />
                        </Field>
                        <Field label="PO Date (K4)">
                            <input type="date" value={form.po_date} onChange={e => setForm({ ...form, po_date: e.target.value })} className={inputCls} />
                        </Field>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Vendor Details (B9)">
                            <textarea
                                value={form.vendor_details}
                                onChange={e => setForm({ ...form, vendor_details: e.target.value })}
                                rows={4}
                                placeholder="Name, Address, TIN..."
                                className={`${inputCls} resize-none`}
                            />
                            <select
                                onChange={e => handleVendorSelect(e.target.value)}
                                className="w-full mt-1 bg-blue-50 border-none rounded-xl px-3.5 py-2 text-[10px] font-black text-blue-600 focus:outline-none uppercase tracking-widest"
                            >
                                <option value="">— Use Vendor Bank —</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Shipping Address (I9)">
                            <textarea
                                value={form.shipping_address}
                                onChange={e => setForm({ ...form, shipping_address: e.target.value })}
                                rows={4}
                                className={`${inputCls} resize-none`}
                            />
                        </Field>
                    </div>
                </Section>

                <Section title="Commercial Details" icon={<Building size={15} />}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Quotation Ref (B20)">
                            <input type="text" value={form.quotation_reference} onChange={e => setForm({ ...form, quotation_reference: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Quotation Date (D20)">
                            <input type="date" value={form.quotation_date} onChange={e => setForm({ ...form, quotation_date: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="PR Number (F20)">
                            <input type="text" value={form.pr_number} onChange={e => setForm({ ...form, pr_number: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Price Basis (H20)">
                            <input type="text" value={form.price_basis} onChange={e => setForm({ ...form, price_basis: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Payment Terms (J20)">
                            <input type="text" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} className={inputCls} />
                        </Field>
                        <Field label="Delivery Date (L20)">
                            <input type="date" value={form.delivery_date} onChange={e => setForm({ ...form, delivery_date: e.target.value })} className={inputCls} />
                        </Field>
                    </div>
                </Section>

                <Section title="Line Items" icon={<ClipboardList size={15} />}>
                    <div className="overflow-x-auto rounded-xl border border-gray-100 overflow-hidden">
                        <table className="w-full text-left bg-white">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    {['#', 'Description', 'Unit', 'Qty', 'Rate', 'Total', ''].map(h => (
                                        <th key={h} className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {form.po_items.map((item, idx) => (
                                    <tr key={idx} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="px-4 py-3 text-xs font-black text-gray-300 w-8">{idx + 1}</td>
                                        <td className="px-4 py-3">
                                            <input value={item.description} onChange={e => handleItemChange(idx, 'description', e.target.value)} className="w-full border-none bg-transparent text-sm font-bold text-gray-700 outline-none focus:ring-0 min-w-[180px] placeholder-gray-300" placeholder="Item description..." />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input value={item.unit} onChange={e => handleItemChange(idx, 'unit', e.target.value)} className="w-14 bg-gray-50 border border-gray-100 rounded-lg py-1.5 text-center text-xs font-black text-gray-500" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))} className="w-16 bg-gray-50 border border-gray-100 rounded-lg py-1.5 text-center text-xs font-black text-gray-700" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="number" value={item.rate} onChange={e => handleItemChange(idx, 'rate', Number(e.target.value))} className="w-24 bg-gray-50 border border-gray-100 rounded-lg py-1.5 text-right px-3 text-xs font-black text-emerald-600" />
                                        </td>
                                        <td className="px-4 py-3 text-sm font-black text-gray-800 whitespace-nowrap">
                                            ₹{(item.quantity * item.rate).toLocaleString('en-IN')}
                                        </td>
                                        <td className="px-4 py-3 w-8">
                                            {form.po_items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(idx)} className="p-1.5 hover:bg-red-50 text-gray-200 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 hover:text-gray-900 uppercase tracking-widest transition-colors">
                        <Plus size={14} /> Add Line Item
                    </button>
                </Section>
            </div>

            {/* Right — sidebar */}
            <div className="space-y-6">
                <Section title="Import" icon={<FileSpreadsheet size={15} />}>
                    <input id="po-parser-upload" type="file" accept=".xlsx,.xls,.pdf" className="hidden" onChange={handleParseFile} />
                    <button
                        type="button"
                        onClick={() => document.getElementById('po-parser-upload').click()}
                        className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 rounded-xl py-6 transition-colors group"
                    >
                        <FileSpreadsheet size={20} className="text-gray-300 group-hover:text-gray-600" />
                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-gray-900">Parse Existing PO</p>
                    </button>
                </Section>

                <Section title="Signature" icon={<Activity size={15} />}>
                    <Field label="Signature Text (B33)">
                        <input type="text" value={form.signature} onChange={e => setForm({ ...form, signature: e.target.value })} className={inputCls} />
                    </Field>
                </Section>

                <div className="bg-slate-900 rounded-2xl p-6 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-3 opacity-10"><DollarSign size={60} /></div>
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Commercial Total (L34)</p>
                    <h4 className="text-3xl font-black tracking-tighter">₹{form.total_amount.toLocaleString('en-IN')}</h4>
                    <p className="text-[10px] font-bold opacity-30 mt-1 uppercase tracking-widest">Auto-computed</p>
                </div>

                <button
                    type="button"
                    onClick={handleGenerateClick}
                    disabled={loading || !form.po_number}
                    className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                    {loading ? 'Generating...' : 'Generate & Initiate'}
                </button>
            </div>
        </div>
    );

    // ── Render: approval panel ────────────────────────────────────────────────
    const renderApprovalPanel = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
            {/* Left */}
            <div className="lg:col-span-2 space-y-6">
                <Section title="Search & Add Approvers" icon={<Search size={15} />}>
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={userSearchTerm}
                            onChange={e => handleUserSearch(e.target.value)}
                            className={`${inputCls} !pl-10`}
                        />
                        {isSearching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={15} />}
                    </div>
                    {userSearchResults.length > 0 && (
                        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                            {userSearchResults.map(user => (
                                <button key={user.id} type="button" onClick={() => addApproverFromSearch(user)} className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-center justify-between group">
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{user.name}</p>
                                        <p className="text-[10px] text-gray-400">{user.email} · {user.designation || 'Staff'}</p>
                                    </div>
                                    <Plus size={14} className="text-gray-300 group-hover:text-blue-600 transition-colors" />
                                </button>
                            ))}
                        </div>
                    )}
                </Section>

                <Section title="Approval Queue" icon={<ClipboardList size={15} />}>
                    {selectedApprovers.length === 0 ? (
                        <div className="flex flex-col items-center py-8 gap-2">
                            <UserCheck size={32} className="text-gray-200" />
                            <p className="text-xs font-black text-gray-300 uppercase tracking-widest">No approvers selected yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {selectedApprovers.map((id, index) => {
                                const approver = userSearchResults.find(u => u.id === id) || approvers.find(u => u.id === id) || { name: 'Loading...', email: '...' };
                                return (
                                    <div key={id} className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                        <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black flex-shrink-0">{index + 1}</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-black text-blue-900 truncate">{approver.name}</p>
                                            <p className="text-[10px] font-bold text-blue-400 truncate">{approver.email}</p>
                                        </div>
                                        <button type="button" onClick={() => toggleApprover(id)} className="text-blue-200 hover:text-red-500 transition-colors"><X size={14} /></button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </Section>
            </div>

            {/* Right */}
            <div className="space-y-6">
                <div className="bg-indigo-50 rounded-2xl border border-indigo-100 p-5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center mb-3">
                        <ShieldCheck size={18} className="text-white" />
                    </div>
                    <h4 className="text-sm font-black text-gray-900 mb-1">Approval Workflow</h4>
                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                        The PO draft is staged on the server. Approvers will be notified sequentially via email.
                    </p>
                </div>

                <button type="button" onClick={() => setApprovalStep(false)} className="w-full py-3 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all">
                    ← Back to Form
                </button>

                <button
                    type="button"
                    onClick={executeWorkflow}
                    disabled={loading || selectedApprovers.length === 0}
                    className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                    {loading ? 'Initiating...' : 'Initiate Workflow'}
                </button>
            </div>
        </div>
    );

    // ── Page render ───────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50">
            <SuccessModal
                isOpen={isSuccessOpen}
                onClose={() => { setIsSuccessOpen(false); setForm(defaultForm); setSelectedApprovers([]); setMode('manual'); }}
                poNumber={form.po_number || selectedPOId}
            />

            {/* Sticky page header */}
            <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center">
                            <FileSpreadsheet size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900">PO Generator</h1>
                            <p className="text-xs text-gray-400 font-medium">Purchase Order — approval workflow enabled</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">
                {/* Mode selector */}
                {!approvalStep && (
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Source Mode</p>
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { key: 'manual', label: 'Manual Entry', icon: Plus, desc: 'Fresh Order' },
                                { key: 'from_pr', label: 'From PR', icon: ClipboardList, desc: 'Existing Req' },
                                { key: 'from_po', label: 'Re-Issue', icon: Package, desc: 'History' },
                            ].map(opt => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    onClick={() => { setMode(opt.key); setForm(defaultForm); setSelectedPRId(''); setSelectedPOId(''); setSuccess(false); }}
                                    className={`p-4 rounded-xl text-left border-2 transition-all ${mode === opt.key ? 'bg-gray-900 border-gray-900' : 'bg-gray-50 border-transparent hover:border-gray-200'}`}
                                >
                                    <opt.icon size={18} className={`mb-2 ${mode === opt.key ? 'text-white' : 'text-blue-600'}`} />
                                    <span className={`text-xs font-black block leading-none mb-0.5 ${mode === opt.key ? 'text-white' : 'text-gray-800'}`}>{opt.label}</span>
                                    <span className={`text-[10px] font-bold block ${mode === opt.key ? 'text-gray-400' : 'text-gray-400'}`}>{opt.desc}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {approvalStep ? renderApprovalPanel() : (
                    mode === 'from_po' ? (
                        <Section title="Re-Issue PO" icon={<Package size={15} />}>
                            <Field label="Select from Procurement History">
                                <select value={selectedPOId} onChange={e => setSelectedPOId(e.target.value)} className={inputCls}>
                                    <option value="">— Select from Procurement Logs —</option>
                                    {existingPOs.map(po => (
                                        <option key={po.id} value={po.id}>{po.poNumber} · {po.vendor?.name} · ₹{Number(po.totalAmount).toLocaleString('en-IN')}</option>
                                    ))}
                                </select>
                            </Field>
                            <button
                                type="button"
                                onClick={handleGenerateClick}
                                disabled={loading || !selectedPOId}
                                className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                            >
                                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Identify & Buffer'}
                            </button>
                        </Section>
                    ) : renderManualForm()
                )}
            </div>
        </div>
    );
};

export default POGenerator;
