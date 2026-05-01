import { useState, useEffect } from 'react';
import {
    Upload, CheckCircle, AlertTriangle, FileText, Save,
    Send, UserCheck, DollarSign, Hash, ClipboardList
} from 'lucide-react';
import api from '../api/axios';
import { validateFile } from '../utils/fileValidation';
import ToastContainer, { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';

// ── Layout helpers  ─────────────────────────────────────────────────
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
    <div className="space-y-1.5 w-full">
        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        {children}
    </div>
);

// ── Main Component ─────────────────────────────────────────────────────────────
const PrUpload = () => {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [allocation, setAllocation] = useState(null);
    const [budgetHeads, setBudgetHeads] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [selectedApproverIds, setSelectedApproverIds] = useState([]);
    const [savedPrId, setSavedPrId] = useState(null);
    const [sendingApproval, setSendingApproval] = useState(false);
    const [approvalStep, setApprovalStep] = useState(false);
    const { toasts, toast, removeToast } = useToast();
    const { user } = useAuth();

    useEffect(() => { fetchInitialData(); }, []);

    const fetchInitialData = async () => {
        try {
            const [headsRes, deptsRes, approversRes] = await Promise.all([
                api.get('/master-data/budget-heads'),
                api.get('/master-data/departments'),
                api.get('/master-data/approvers'),
            ]);
            setBudgetHeads(headsRes.data);
            setDepartments(deptsRes.data);
            setApprovers(approversRes.data);
        } catch (err) { console.error('Failed to fetch initial data:', err); }
    };

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            const validationError = validateFile(selectedFile, {
                maxSize: 10 * 1024 * 1024,
                allowedTypes: ['.pdf']
            });

            if (validationError) {
                toast.error('File Rejected', validationError);
                e.target.value = '';
                return;
            }
            setFile(selectedFile);
        }
    };

    const handleUpload = async () => {
        if (!file) { toast.warning('No File Selected', 'Please select a PDF file before uploading.'); return; }
        setLoading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const response = await api.post('/prs/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const dateObj = response.data.parsed.date ? new Date(response.data.parsed.date) : new Date();
            const defaultMonth = isNaN(dateObj.getMonth()) ? (new Date().getMonth() + 1) : (dateObj.getMonth() + 1);
            const defaultYear = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
            setParsedData({
                ...response.data.parsed,
                month: response.data.parsed.month || defaultMonth,
                year: response.data.parsed.year || defaultYear,
            });
            setAllocation(response.data.allocationSuggestion || {
                status: 'UNMAPPED',
                notes: ['Please select a Department and WBS Head manually.'],
                amount: response.data.parsed.totalValue || 0,
            });
        } catch (err) {
            console.error(err);
            toast.error('Parsing Failed', 'Could not parse the PR PDF. Please check the file and try again.');
        } finally { setLoading(false); }
    };

    const handleAllocationChange = (headId) => {
        const selectedHead = budgetHeads.find(h => h.id === headId);
        if (selectedHead) {
            const isSufficient = (selectedHead.totalBalance || 0) >= (parsedData?.totalValue || 0);
            setAllocation({
                ...allocation,
                budgetHeadId: selectedHead.id,
                budgetHeadName: selectedHead.name,
                status: isSufficient ? 'MAPPED' : 'INSUFFICIENT',
                isManualOverride: true,
                notes: [isSufficient ? `Successfully Mapped: ${selectedHead.name}` : `Insufficient funds in selected head: ${selectedHead.name}`]
            });
        }
    };

    const handleSubmit = async () => {
        const payload = {
            ...parsedData,
            prNumber: parsedData.indentNo || parsedData.prNumber,
            date: parsedData.date,
            month: parseInt(parsedData.month),
            year: parseInt(parsedData.year),
            departmentId: parsedData.departmentId,
            description: parsedData.description,
            totalValue: parseFloat(parsedData.totalValue),
            wbsCode: parsedData.wbsCode,
            indentor: parsedData.indentor || user?.name || null,
            approver: parsedData.approver || null,
            verifiedBy: parsedData.verifiedBy || null,
            pdfPath: parsedData.pdfPath || null,
            lineItems: parsedData.lineItems || [],
            allocations: [{
                budgetHeadId: allocation.budgetHeadId,
                subClassificationId: allocation.subClassificationId || null,
                amount: allocation.amount || parsedData.totalValue,
                isManualOverride: allocation.isManualOverride || false
            }]
        };
        try {
            const res = await api.post('/prs', payload);
            toast.success('PR Created Successfully!', `PR "${payload.prNumber}" has been saved. Now select approvers to send for approval.`);
            setSavedPrId(res.data.id);
            setApprovalStep(true);
        } catch (err) {
            console.error('PR Submission Error Details:', err.response?.data || err.message);
            if (err.response?.status === 409) toast.warning('PR Already Exists', err.response.data.error);
            else toast.error('Failed to Save PR', err.response?.data?.error || err.message);
        }
    };

    const handleToggleApprover = (id) => {
        setSelectedApproverIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleSendApproval = async () => {
        if (!savedPrId || selectedApproverIds.length === 0) { toast.warning('No Approvers Selected', 'Please select at least one approver.'); return; }
        setSendingApproval(true);
        try {
            const res = await api.post('/approvals/send', { prId: savedPrId, approverIds: selectedApproverIds });
            const sent = res.data.results?.filter(r => r.status === 'sent').length || 0;
            const failed = res.data.results?.filter(r => r.status === 'failed').length || 0;
            if (sent > 0) toast.success('Approval Emails Sent!', `Sent to ${sent} approver(s).${failed > 0 ? ` ${failed} failed.` : ''}`);
            else toast.error('Email Sending Failed', 'Could not send emails. Check SMTP config in .env.');
            setFile(null); setParsedData(null); setAllocation(null);
            setSavedPrId(null); setApprovalStep(false); setSelectedApproverIds([]);
        } catch (err) {
            toast.error('Send Failed', err.response?.data?.error || err.message);
        } finally { setSendingApproval(false); }
    };

    const handleSkipApproval = () => {
        setFile(null); setParsedData(null); setAllocation(null);
        setSavedPrId(null); setApprovalStep(false); setSelectedApproverIds([]);
        toast.success('PR Saved', 'You can send for approval later from the PR Tracking page.');
    };

    const filteredHeads = budgetHeads.filter(h => !parsedData?.departmentId || h.departmentId === parsedData.departmentId);

    return (
        <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="min-h-screen bg-gray-50">
                {/* Sticky header */}
                <div className="bg-white border-b border-gray-100 px-8 py-6 sticky top-0 z-10">
                    <div className="max-w-5xl mx-auto flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-900 rounded-2xl flex items-center justify-center">
                            <Upload size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-gray-900">PR Generator</h1>
                            <p className="text-xs text-gray-400 font-medium">Upload a PDF to extract details and allocate budget</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-5xl mx-auto px-8 py-8 space-y-6">

                    {/* ── Step 1: Upload ── */}
                    {!parsedData && !approvalStep && (
                        <Section title="Upload PR Document" icon={<FileText size={15} />}>
                            <label
                                htmlFor="pr-file-upload"
                                className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-200 hover:border-gray-900 bg-gray-50 rounded-xl py-12 cursor-pointer transition-colors group"
                            >
                                <Upload size={28} className="text-gray-300 group-hover:text-gray-600 transition-colors" />
                                <div className="text-center">
                                    <p className="text-[11px] font-black text-gray-500 uppercase tracking-tighter group-hover:text-gray-900">Click to upload PR PDF</p>
                                    <p className="text-[10px] text-gray-400 mt-0.5">PDF · Max 10MB</p>
                                </div>
                                <input id="pr-file-upload" type="file" accept=".pdf" className="hidden" onChange={handleFileChange} />
                            </label>

                            {file && (
                                <div className="flex items-center justify-between bg-gray-900 text-white rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <FileText size={14} className="opacity-50 flex-shrink-0" />
                                        <p className="text-xs font-bold truncate">{file.name}</p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleUpload}
                                        disabled={loading}
                                        className="ml-4 flex-shrink-0 bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition-all"
                                    >
                                        {loading ? 'Processing…' : 'Upload & Parse'}
                                    </button>
                                </div>
                            )}
                        </Section>
                    )}

                    {/* ── Step 2: Parsed data + budget selection ── */}
                    {parsedData && !approvalStep && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Left — extracted details */}
                            <div className="lg:col-span-2 space-y-6">
                                <Section title="Extracted Details" icon={<FileText size={15} />}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">AI Parser Live</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Indent Number">
                                            <input
                                                type="text"
                                                className={inputCls}
                                                value={parsedData.indentNo || parsedData.prNumber || ''}
                                                onChange={e => setParsedData({ ...parsedData, indentNo: e.target.value })}
                                            />
                                        </Field>
                                        <Field label="Date of Issue">
                                            <input
                                                type="text"
                                                className={inputCls}
                                                value={parsedData.date || ''}
                                                onChange={e => setParsedData({ ...parsedData, date: e.target.value })}
                                            />
                                        </Field>
                                    </div>

                                    <Field label="Requesting Department">
                                        <select
                                            className={inputCls}
                                            value={parsedData.department || ''}
                                            onChange={e => {
                                                const deptName = e.target.value;
                                                const dbDept = departments.find(d => d.name === deptName);
                                                const deptId = dbDept ? dbDept.id : deptName;
                                                setParsedData({ ...parsedData, departmentId: deptId, department: deptName });
                                                setAllocation({ ...allocation, budgetHeadId: null, status: 'UNMAPPED', notes: ['Department changed. Please select a new WBS Head.'] });
                                            }}
                                        >
                                            <option value="" disabled>— Select Department —</option>
                                            <option value="Mining">Mining</option>
                                            <option value="Electrical">Electrical</option>
                                            <option value="Piping">Piping</option>
                                            <option value="Mechanical">Mechanical</option>
                                            <option value="Civil">Civil</option>
                                            <option value="General">General</option>
                                        </select>
                                    </Field>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <Field label="Budget Month">
                                            <select className={inputCls} value={parsedData.month || ''} onChange={e => setParsedData({ ...parsedData, month: e.target.value })}>
                                                {Array.from({ length: 12 }, (_, i) => (
                                                    <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                                ))}
                                            </select>
                                        </Field>
                                        <Field label="Budget Year">
                                            <select className={inputCls} value={parsedData.year || ''} onChange={e => setParsedData({ ...parsedData, year: e.target.value })}>
                                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                                            </select>
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <Field label="Indentor">
                                            <input type="text" className={inputCls} value={parsedData.indentor || ''} onChange={e => setParsedData({ ...parsedData, indentor: e.target.value })} />
                                        </Field>
                                        <Field label="Verified By">
                                            <input type="text" className={inputCls} value={parsedData.verifiedBy || ''} onChange={e => setParsedData({ ...parsedData, verifiedBy: e.target.value })} />
                                        </Field>
                                        <Field label="Approved By">
                                            <input type="text" className={inputCls} value={parsedData.approver || ''} onChange={e => setParsedData({ ...parsedData, approver: e.target.value })} />
                                        </Field>
                                    </div>

                                    <Field label="Description / Notes">
                                        <textarea className={`${inputCls} resize-none`} rows={2} value={parsedData.description || ''} onChange={e => setParsedData({ ...parsedData, description: e.target.value })} />
                                    </Field>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Value (₹)</p>
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border-none p-0 text-xl font-black text-gray-900 focus:ring-0 outline-none"
                                                value={parsedData.totalValue || 0}
                                                onChange={e => setParsedData({ ...parsedData, totalValue: parseFloat(e.target.value) })}
                                            />
                                        </div>
                                        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Detected WBS Code</p>
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border-none p-0 text-sm font-black text-blue-700 focus:ring-0 outline-none"
                                                value={parsedData.wbsCode || ''}
                                                onChange={e => setParsedData({ ...parsedData, wbsCode: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </Section>

                                {/* Line Items */}
                                {parsedData.lineItems?.length > 0 && (
                                    <Section title="Extracted Line Items" icon={<ClipboardList size={15} />}>
                                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">S.No</th>
                                                        <th className="px-4 py-2.5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {parsedData.lineItems.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-4 py-2.5 font-bold text-gray-400 align-top">{item.sNo}</td>
                                                            <td className="px-4 py-2.5 font-medium text-gray-700">{item.text || item.description}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Section>
                                )}
                            </div>

                            {/* Right — budget selector */}
                            <div className="space-y-6">
                                <Section title="Budget Explorer" icon={<DollarSign size={15} />}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full uppercase">
                                            {filteredHeads.length} heads available
                                        </span>
                                    </div>

                                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                        {filteredHeads.length === 0 ? (
                                            <div className="flex flex-col items-center py-8 gap-2">
                                                <AlertTriangle size={28} className="text-gray-200" />
                                                <p className="text-xs font-black text-gray-300 uppercase tracking-widest text-center">No heads found for this dept</p>
                                            </div>
                                        ) : filteredHeads.map(head => {
                                            const isSelected = allocation?.budgetHeadId === head.id;
                                            const isInsufficient = (head.totalBalance || 0) < (parsedData.totalValue || 0);
                                            return (
                                                <div
                                                    key={head.id}
                                                    onClick={() => handleAllocationChange(head.id)}
                                                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${isSelected ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'} ${isInsufficient && !isSelected ? 'opacity-50' : ''}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div className="min-w-0">
                                                            <p className={`text-[10px] font-black uppercase tracking-widest truncate ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>{head.code}</p>
                                                            <h4 className="text-xs font-bold text-gray-800 line-clamp-1">{head.name}</h4>
                                                        </div>
                                                        {isSelected && <CheckCircle size={15} className="text-gray-900 flex-shrink-0 ml-2" />}
                                                    </div>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className={`text-xs font-black ${isInsufficient ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            ₹{head.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                        {isInsufficient && (
                                                            <span className="text-[9px] font-black bg-red-50 text-red-500 px-2 py-0.5 rounded-full uppercase">Insufficient</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {allocation?.budgetHeadId && (
                                        <div className="mt-2 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">Selected</p>
                                                    <p className="text-xs font-black text-gray-900">{allocation.budgetHeadName}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase">PR Total</p>
                                                    <p className="text-xs font-black text-gray-900">₹{parsedData.totalValue?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </Section>

                                {!allocation?.budgetHeadId && (
                                    <p className="text-xs text-gray-400 italic text-center">Select a budget head above to proceed.</p>
                                )}

                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={!allocation?.budgetHeadId || allocation?.status === 'INSUFFICIENT'}
                                    className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                                >
                                    <Save size={17} />
                                    Confirm PR Submission
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── Step 3: Approval ── */}
                    {approvalStep && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-300">
                            {/* Left — approver list */}
                            <div className="lg:col-span-2 space-y-6">
                                <Section title="Send for Approval" icon={<UserCheck size={15} />}>
                                    <p className="text-xs font-bold text-gray-400">PR saved — select approvers to notify via email</p>

                                    {approvers.length === 0 ? (
                                        <div className="flex flex-col items-center py-8 gap-2">
                                            <AlertTriangle size={28} className="text-gray-200" />
                                            <p className="text-xs font-black text-gray-300 uppercase tracking-widest text-center">No approvers configured</p>
                                            <p className="text-[10px] text-gray-400 text-center">Go to Master Data → Approvers to add approvers first.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                            {approvers.map(a => {
                                                const checked = selectedApproverIds.includes(a.id);
                                                return (
                                                    <div
                                                        key={a.id}
                                                        onClick={() => handleToggleApprover(a.id)}
                                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-gray-900 bg-gray-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                                                    >
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-gray-900 border-gray-900' : 'border-gray-300'}`}>
                                                            {checked && <CheckCircle size={12} className="text-white" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-black truncate ${checked ? 'text-gray-900' : 'text-gray-700'}`}>{a.name}</p>
                                                            <p className="text-[10px] text-gray-400 truncate">{a.email}{a.department ? ` · ${a.department.name}` : ''}</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Section>
                            </div>

                            {/* Right — actions */}
                            <div className="space-y-6">
                                <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-5">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center mb-3">
                                        <Hash size={18} className="text-white" />
                                    </div>
                                    <h4 className="text-sm font-black text-gray-900 mb-1">PR Created</h4>
                                    <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                        Your PR has been saved. Select approvers to trigger email notifications.
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleSendApproval}
                                    disabled={sendingApproval || selectedApproverIds.length === 0}
                                    className="w-full bg-gray-900 text-white rounded-2xl py-4 flex items-center justify-center gap-3 font-black text-sm hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:grayscale shadow-xl shadow-gray-200"
                                >
                                    <Send size={16} />
                                    {sendingApproval ? 'Sending…' : `Send to ${selectedApproverIds.length || 0} Approver${selectedApproverIds.length !== 1 ? 's' : ''}`}
                                </button>

                                <button
                                    type="button"
                                    onClick={handleSkipApproval}
                                    className="w-full py-3 bg-white border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-gray-50 transition-all"
                                >
                                    Skip for Now
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default PrUpload;
