import { useState, useRef, useEffect } from 'react';
import {
    FileText, Hash, DollarSign, Plus, Trash2,
    ChevronRight, AlertCircle, CheckCircle2, Loader2, ClipboardList,
    UploadCloud, X, Paperclip, Sparkles
} from 'lucide-react';
import api from '../api/axios';
import { validateFile } from '../utils/fileValidation';

const EMPTY_FORM = {
    project: '',
    itemDescription: '',
    ntdRefNo: '',
    nfaDate: '',
    indentNo: '',
    sapPrNo: '',
    wbsNumber: [''],
    financials: {
        totalBudget: '',
        balance: '',
        currentNFAValue: '',
        estimatedBalance: '',
    },
    approvers: {
        level1: null,
        level2: null,
        level3: null
    }
};

const inputCls = 'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-400 transition-all';

const Section = ({ title, icon, children }) => (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:shadow-md hover:border-gray-200">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-gray-100 bg-gray-50/50">
            <span className="text-gray-400">{icon}</span>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">{title}</h3>
        </div>
        <div className="p-5 space-y-4">{children}</div>
    </div>
);

const Field = ({ label, required, children }) => (
    <div className="space-y-1.5 flex-1 w-full">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

const ApproverField = ({ label, value, onSelect }) => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [show, setShow] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShow(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSearch = async (val) => {
        setQuery(val);
        if (!val.trim()) { setResults([]); return; }
        try {
            const res = await api.get(`/auth/search-users?q=${val}`);
            setResults(res.data);
            setShow(true);
        } catch (err) { console.error(err); }
    };

    return (
        <div className="space-y-1.5 relative" ref={dropdownRef}>
            <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{label}</label>
            {value ? (
                <div className="flex items-center justify-between bg-white border border-emerald-100 rounded-xl px-3 py-2.5 shadow-sm shadow-emerald-50">
                    <div className="min-w-0">
                        <p className="text-xs font-black text-gray-900 truncate">{value.name}</p>
                        <p className="text-[10px] font-medium text-emerald-600 truncate">{value.email}</p>
                    </div>
                    <button type="button" onClick={() => onSelect(null)} className="text-gray-300 hover:text-red-500">
                        <X size={14} />
                    </button>
                </div>
            ) : (
                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={query}
                        onChange={e => handleSearch(e.target.value)}
                        onFocus={() => query.trim() && setShow(true)}
                        className={`${inputCls} !text-xs !bg-gray-50/50`}
                    />
                    {show && results.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 max-h-48 overflow-y-auto">
                            {results.map(user => (
                                <button
                                    key={user.id}
                                    type="button"
                                    onClick={() => { onSelect(user); setShow(false); setQuery(''); }}
                                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0"
                                >
                                    <p className="text-xs font-black text-gray-900">{user.name}</p>
                                    <p className="text-[10px] text-gray-400">{user.email} • {user.designation || 'Staff'}</p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const NfaGenerator = () => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [attachment, setAttachment] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [parseSuccess, setParseSuccess] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    const handleAttachment = (e) => {
        const file = e.target.files?.[0];
        if (file) { 
            const validationError = validateFile(file, {
                maxSize: 15 * 1024 * 1024,
                allowedTypes: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg']
            });

            if (validationError) {
                setError(validationError);
                e.target.value = '';
                return;
            }

            setAttachment(file); 
            setParseSuccess(false); 
            setError(null);
        }
        e.target.value = '';
    };

    const removeAttachment = () => { setAttachment(null); setParseSuccess(false); };

    const handleParse = async () => {
        if (!attachment) return;
        setParsing(true);
        setError(null);
        try {
            const fd = new FormData();
            fd.append('document', attachment);
            const res = await api.post('/nfas/parse', fd);
            const { extracted } = res.data;
            setForm(prev => ({
                ...prev,
                project:         extracted.project         ?? prev.project,
                itemDescription: extracted.itemDescription ?? prev.itemDescription,
                ntdRefNo:        extracted.ntdRefNo        ?? prev.ntdRefNo,
                nfaDate:         extracted.nfaDate         ?? prev.nfaDate,
                indentNo:        extracted.indentNo        ?? prev.indentNo,
                sapPrNo:         extracted.sapPrNo         ?? prev.sapPrNo,
                wbsNumber:       extracted.wbsNumber?.length ? extracted.wbsNumber : prev.wbsNumber,
                financials: {
                    totalBudget:      extracted.financials?.totalBudget      ?? prev.financials.totalBudget,
                    balance:          extracted.financials?.balance          ?? prev.financials.balance,
                    currentNFAValue:  extracted.financials?.currentNFAValue  ?? prev.financials.currentNFAValue,
                    estimatedBalance: extracted.financials?.estimatedBalance ?? prev.financials.estimatedBalance,
                },
            }));
            setParseSuccess(true);
        } catch (err) {
            setError(err?.response?.data?.error || 'AI parsing failed. Please fill the form manually.');
        } finally {
            setParsing(false);
        }
    };

    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleFinancialChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            financials: { ...prev.financials, [field]: value },
        }));
    };

    const handleWbsChange = (index, value) => {
        const updated = [...form.wbsNumber];
        updated[index] = value;
        setForm(prev => ({ ...prev, wbsNumber: updated }));
    };

    const addWbs = () => {
        setForm(prev => ({ ...prev, wbsNumber: [...prev.wbsNumber, ''] }));
    };

    const removeWbs = (index) => {
        if (form.wbsNumber.length === 1) return;
        const updated = form.wbsNumber.filter((_, i) => i !== index);
        setForm(prev => ({ ...prev, wbsNumber: updated }));
    };

    const setLevelApprover = (level, user) => {
        setForm(prev => ({
            ...prev,
            approvers: { ...prev.approvers, [level]: user }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (!form.project.trim()) return setError('Project is required.');
        if (!form.itemDescription.trim()) return setError('Item description is required.');
        if (!form.nfaDate) return setError('NFA date is required.');
        if (form.wbsNumber.some(w => !w.trim())) return setError('All WBS entries must be filled or removed.');
        if (!form.approvers.level1) return setError('At least Stage 1 approver is required for the workflow.');

        const financialsPayload = {
            totalBudget: form.financials.totalBudget ? Number(form.financials.totalBudget) : null,
            balance: form.financials.balance ? Number(form.financials.balance) : null,
            currentNFAValue: form.financials.currentNFAValue ? Number(form.financials.currentNFAValue) : null,
            estimatedBalance: form.financials.estimatedBalance ? Number(form.financials.estimatedBalance) : null,
        };

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('project', form.project);
            formData.append('itemDescription', form.itemDescription);
            formData.append('nfaDate', form.nfaDate);
            if (form.ntdRefNo) formData.append('ntdRefNo', form.ntdRefNo);
            if (form.indentNo) formData.append('indentNo', form.indentNo);
            if (form.sapPrNo) formData.append('sapPrNo', form.sapPrNo);
            formData.append('wbsNumber', JSON.stringify(form.wbsNumber.map(w => w.trim()).filter(Boolean)));
            formData.append('financials', JSON.stringify(financialsPayload));
            if (attachment) formData.append('document', attachment);

            const nfaRes = await api.post('/nfas', formData);
            const createdNfa = nfaRes.data;

            const steps = [];
            if (form.approvers.level1) steps.push({ approverId: form.approvers.level1.id, level: 1, approvalMode: 'ANY' });
            if (form.approvers.level2) steps.push({ approverId: form.approvers.level2.id, level: 2, approvalMode: 'ANY' });
            if (form.approvers.level3) steps.push({ approverId: form.approvers.level3.id, level: 3, approvalMode: 'ANY' });

            await api.post('/in-approvals', {
                requestId: createdNfa.nfaNumber,
                requestType: 'NFA',
                entityId: createdNfa.id,
                title: `Approval for ${createdNfa.nfaNumber}: ${createdNfa.itemDescription.substring(0, 50)}...`,
                steps
            });

            setSuccess(true);
            setForm(EMPTY_FORM);
            setAttachment(null);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to generate NFA. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                        <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 mb-2">NFA & Workflow Created</h2>
                    <p className="text-sm text-gray-500 mb-8">Your Note for Approval has been submitted and the approval workflow has been initiated.</p>
                    <button
                        onClick={() => setSuccess(false)}
                        className="bg-gray-900 text-white text-sm font-black px-8 py-3 rounded-2xl hover:bg-gray-800 transition-colors"
                    >
                        Create Another NFA
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center">
                            <ClipboardList size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900">NFA Generator</h1>
                            <p className="text-xs text-gray-400 font-medium">Note for Approval — workflow selection enabled</p>
                        </div>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-6">
                        <Section title="General Information" icon={<FileText size={15} />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Field label="Project" required>
                                    <input
                                        type="text"
                                        placeholder="e.g. MMCL Mining Expansion"
                                        value={form.project}
                                        onChange={e => handleChange('project', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="NFA Date" required>
                                    <input
                                        type="date"
                                        value={form.nfaDate}
                                        onChange={e => handleChange('nfaDate', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                            <Field label="Item Description" required>
                                <textarea
                                    rows={3}
                                    placeholder="Describe the item or service..."
                                    value={form.itemDescription}
                                    onChange={e => handleChange('itemDescription', e.target.value)}
                                    className={`${inputCls} resize-none`}
                                />
                            </Field>
                        </Section>

                        <Section title="Reference Numbers" icon={<Hash size={15} />}>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Field label="NTD Ref No.">
                                    <input
                                        type="text"
                                        placeholder="NTD-XXXX"
                                        value={form.ntdRefNo}
                                        onChange={e => handleChange('ntdRefNo', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Indent No.">
                                    <input
                                        type="text"
                                        placeholder="PR-XXX"
                                        value={form.indentNo}
                                        onChange={e => handleChange('indentNo', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="SAP PR No.">
                                    <input
                                        type="text"
                                        placeholder="XXXXXXXXXX"
                                        value={form.sapPrNo}
                                        onChange={e => handleChange('sapPrNo', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </Section>

                        <Section title="Financials" icon={<DollarSign size={15} />}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                                <Field label="Total Budget">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.financials.totalBudget}
                                        onChange={e => handleFinancialChange('totalBudget', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Current NFA Value">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.financials.currentNFAValue}
                                        onChange={e => handleFinancialChange('currentNFAValue', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Balance">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.financials.balance}
                                        onChange={e => handleFinancialChange('balance', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                                <Field label="Estimated Balance">
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={form.financials.estimatedBalance}
                                        onChange={e => handleFinancialChange('estimatedBalance', e.target.value)}
                                        className={inputCls}
                                    />
                                </Field>
                            </div>
                        </Section>
                    </div>

                    <div className="space-y-6">
                        <Section title="Approval Workflow" icon={<Plus size={15} />}>
                            <div className="space-y-4">
                                <ApproverField 
                                    label="Stage 1 Approval" 
                                    value={form.approvers.level1} 
                                    onSelect={(u) => setLevelApprover('level1', u)} 
                                />
                                <ApproverField 
                                    label="Stage 2 Approval" 
                                    value={form.approvers.level2} 
                                    onSelect={(u) => setLevelApprover('level2', u)} 
                                />
                                <ApproverField 
                                    label="Stage 3 Approval" 
                                    value={form.approvers.level3} 
                                    onSelect={(u) => setLevelApprover('level3', u)} 
                                />
                            </div>
                            <p className="text-[10px] text-gray-400 mt-2 italic leading-relaxed">
                                Workflow will be sequential (Stage 1 → 2 → 3). Approvers will receive notifications in order.
                            </p>
                        </Section>

                        <Section title="NFA Document" icon={<Paperclip size={15} />}>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                onChange={handleAttachment}
                                className="hidden"
                            />
                            {!attachment ? (
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full flex flex-col items-center justify-center gap-2 border border-dashed border-gray-300 hover:border-gray-900 bg-gray-50 rounded-xl py-6 transition-colors group"
                                >
                                    <UploadCloud size={20} className="text-gray-300 group-hover:text-gray-600" />
                                    <div className="text-center">
                                        <p className="text-[11px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-gray-900">Attach Document</p>
                                    </div>
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between bg-black text-white rounded-xl px-3 py-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <FileText size={14} className="opacity-50" />
                                            <p className="text-[11px] font-bold truncate">{attachment.name}</p>
                                        </div>
                                        <button type="button" onClick={removeAttachment} className="hover:text-red-400">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleParse}
                                        disabled={parsing}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest py-2 rounded-lg hover:bg-indigo-100 disabled:opacity-50"
                                    >
                                        {parsing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                        {parsing ? 'Extracting...' : 'AI Auto-fill'}
                                    </button>
                                </div>
                            )}
                        </Section>

                        <Section title="WBS Codes" icon={<Hash size={15} />}>
                            <div className="space-y-2">
                                {form.wbsNumber.map((wbs, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            placeholder={`WBS ${index + 1}`}
                                            value={wbs}
                                            onChange={e => handleWbsChange(index, e.target.value)}
                                            className={`${inputCls} !py-2 !text-xs`}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeWbs(index)}
                                            disabled={form.wbsNumber.length === 1}
                                            className="text-gray-300 hover:text-red-500 disabled:opacity-0"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addWbs} className="text-[10px] font-bold text-gray-400 hover:text-gray-900">+ Add WBS Code</button>
                            </div>
                        </Section>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-3 rounded-xl flex items-start gap-2 text-xs border border-red-100">
                                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : null}
                            {submitting ? 'GENERATING NFA...' : 'CREATE NFA & WORKFLOW'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default NfaGenerator;
