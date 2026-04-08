import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertTriangle, FileText, Save, Send, UserCheck } from 'lucide-react';
import api from '../api/axios';
import ToastContainer, { useToast } from '../components/Toast';

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
    const [approvalStep, setApprovalStep] = useState(false); // show after PR saved
    const { toasts, toast, removeToast } = useToast();

    useEffect(() => {
        fetchInitialData();
    }, []);

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
        } catch (err) {
            console.error('Failed to fetch initial data:', err);
        }
    };


    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) {
            toast.warning('No File Selected', 'Please select a PDF file before uploading.');
            return;
        }

        setLoading(true);


        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await api.post('/prs/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

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
        } finally {
            setLoading(false);
        }
    };

    const handleAllocationChange = (headId) => {
        console.log("Selected headId:", headId);
        const selectedHead = budgetHeads.find(h => h.id === headId);

        if (selectedHead) {
            const isSufficient = (selectedHead.totalBalance || 0) >= (parsedData?.totalValue || 0);
            setAllocation({
                ...allocation,
                budgetHeadId: selectedHead.id,
                budgetHeadName: selectedHead.name,
                status: isSufficient ? 'MAPPED' : 'INSUFFICIENT',
                isManualOverride: true,
                notes: [
                    isSufficient
                        ? `Successfully Mapped: ${selectedHead.name}`
                        : `Insufficient funds in selected head: ${selectedHead.name}`
                ]
            });
        }
    };

    const handleSubmit = async () => {

        // Prepare final payload with potential overrides
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
            indentor: parsedData.indentor || null,
            approver: parsedData.approver || null,
            verifiedBy: parsedData.verifiedBy || null,
            pdfPath: parsedData.pdfPath || null,
            lineItems: parsedData.lineItems || [],
            allocations: [
                {
                    budgetHeadId: allocation.budgetHeadId,
                    subClassificationId: allocation.subClassificationId || null,
                    amount: allocation.amount || parsedData.totalValue,
                    isManualOverride: allocation.isManualOverride || false
                }
            ]
        };

        try {
            const res = await api.post('/prs', payload);
            toast.success('PR Created Successfully!', `PR "${payload.prNumber}" has been saved. Now select approvers to send for approval.`);
            setSavedPrId(res.data.id);
            setApprovalStep(true);
        } catch (err) {
            console.error('PR Submission Error Details:', err.response?.data || err.message);
            if (err.response?.status === 409) {
                toast.warning('PR Already Exists', err.response.data.error);
            } else {
                toast.error('Failed to Save PR', err.response?.data?.error || err.message);
            }
        }
    };

    const handleToggleApprover = (id) => {
        setSelectedApproverIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const handleSendApproval = async () => {
        if (!savedPrId || selectedApproverIds.length === 0) {
            toast.warning('No Approvers Selected', 'Please select at least one approver.');
            return;
        }
        setSendingApproval(true);
        try {
            const res = await api.post('/approvals/send', { prId: savedPrId, approverIds: selectedApproverIds });
            const sent = res.data.results?.filter(r => r.status === 'sent').length || 0;
            const failed = res.data.results?.filter(r => r.status === 'failed').length || 0;
            if (sent > 0) toast.success('Approval Emails Sent!', `Sent to ${sent} approver(s).${failed > 0 ? ` ${failed} failed.` : ''}`);
            else toast.error('Email Sending Failed', 'Could not send emails. Check SMTP config in .env.');
            // Reset all
            setFile(null);
            setParsedData(null);
            setAllocation(null);
            setSavedPrId(null);
            setApprovalStep(false);
            setSelectedApproverIds([]);
        } catch (err) {
            toast.error('Send Failed', err.response?.data?.error || err.message);
        } finally {
            setSendingApproval(false);
        }
    };

    const handleSkipApproval = () => {
        setFile(null);
        setParsedData(null);
        setAllocation(null);
        setSavedPrId(null);
        setApprovalStep(false);
        setSelectedApproverIds([]);
        toast.success('PR Saved', 'You can send for approval later from the PR Tracking page.');
    };


    return (
        <>
            <ToastContainer toasts={toasts} onRemove={removeToast} />
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Upload Purchase Requisition</h2>
                <p className="text-gray-500 mb-8">Upload a PDF to automatically extract details and get budget allocation suggestions.</p>

                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8">
                    <div className="flex items-center justify-center w-full">
                        <label htmlFor="dropzone-file" className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                                <p className="text-sm text-gray-500 font-semibold">Click to upload PR PDF</p>
                                <p className="text-xs text-gray-500 mt-1">PDF (MAX. 10MB)</p>
                            </div>
                            <input id="dropzone-file" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} />
                        </label>
                    </div>
                    {file && (
                        <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 text-blue-700 rounded-lg">
                            <div className="flex items-center">
                                <FileText size={20} className="mr-2" />
                                <span className="font-medium">{file.name}</span>
                            </div>
                            <button
                                onClick={handleUpload}
                                disabled={loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Processing...' : 'Upload & Process'}
                            </button>
                        </div>
                    )}

                </div>

                {parsedData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Parsed Details */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-800 flex items-center">
                                    <FileText size={22} className="mr-3 text-blue-600" />
                                    Smart Extraction
                                </h3>
                                <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full uppercase tracking-tighter">AI Parser Live</span>
                            </div>

                            <div className="space-y-5">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Indent Number</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.indentNo || parsedData.prNumber || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, indentNo: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Date of Issue</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.date || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, date: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Requesting Department</label>
                                    <select
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={parsedData.departmentId || ''}
                                        onChange={(e) => {
                                            const deptId = e.target.value;
                                            const dept = departments.find(d => d.id === deptId);
                                            setParsedData({ ...parsedData, departmentId: deptId, department: dept?.name });
                                            // Reset WBS selection when department changes
                                            setAllocation({
                                                ...allocation,
                                                budgetHeadId: null,
                                                status: 'UNMAPPED',
                                                notes: ['Department changed. Please select a new WBS Head.']
                                            });
                                        }}
                                    >
                                        <option value="" disabled>-- Select Department --</option>
                                        {departments.map(dept => (
                                            <option key={dept.id} value={dept.id}>{dept.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Budget Month</label>
                                        <select
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.month || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, month: e.target.value })}
                                        >
                                            {Array.from({ length: 12 }, (_, i) => (
                                                <option key={i + 1} value={i + 1}>
                                                    {new Date(0, i).toLocaleString('default', { month: 'long' })}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Budget Year</label>
                                        <select
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.year || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, year: e.target.value })}
                                        >
                                            {[2024, 2025, 2026, 2027].map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Indentor</label>
                                    <input
                                        type="text"
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        value={parsedData.indentor || ''}
                                        onChange={(e) => setParsedData({ ...parsedData, indentor: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Verified By</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.verifiedBy || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, verifiedBy: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Approved By</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                            value={parsedData.approver || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, approver: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Full Description / Notes</label>
                                    <textarea
                                        className="w-full bg-gray-50 border-none rounded-xl px-4 py-2.5 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500"
                                        rows="2"
                                        value={parsedData.description || ''}
                                        onChange={(e) => setParsedData({ ...parsedData, description: e.target.value })}
                                    />
                                </div>

                                {/* Line Items Table Preview */}
                                {parsedData.lineItems?.length > 0 && (
                                    <div className="mt-4">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Extracted Line Items</label>
                                        <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-gray-100 text-[9px] font-black text-gray-400 uppercase">
                                                    <tr>
                                                        <th className="px-3 py-2">S.No</th>
                                                        <th className="px-3 py-2">Description</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {parsedData.lineItems.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-white transition-colors">
                                                            <td className="px-3 py-2 font-bold text-gray-400 align-top">{item.sNo}</td>
                                                            <td className="px-3 py-2 font-medium text-gray-700">{item.text || item.description}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                        <label className="text-[9px] font-black text-gray-400 uppercase mb-1 block">Total value ($)</label>
                                        <input
                                            type="number"
                                            className="w-full bg-transparent border-none p-0 text-lg font-black text-gray-900 focus:ring-0"
                                            value={parsedData.totalValue || 0}
                                            onChange={(e) => setParsedData({ ...parsedData, totalValue: parseFloat(e.target.value) })}
                                        />
                                    </div>
                                    <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                                        <label className="text-[9px] font-black text-blue-400 uppercase mb-1 block">Detected WBS Code</label>
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-none p-0 text-sm font-black text-blue-700 focus:ring-0"
                                            value={parsedData.wbsCode || ''}
                                            onChange={(e) => setParsedData({ ...parsedData, wbsCode: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Budget Selector List */}
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-black text-gray-800 flex items-center">
                                    <CheckCircle size={22} className="mr-3 text-green-600" />
                                    Budget Explorer
                                </h3>
                                <div className="text-[10px] font-black bg-green-50 text-green-600 px-3 py-1 rounded-full uppercase">
                                    {budgetHeads.filter(h => !parsedData.departmentId || h.departmentId === parsedData.departmentId).length} Available Heads
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                                {budgetHeads
                                    .filter(head => !parsedData.departmentId || head.departmentId === parsedData.departmentId)
                                    .map(head => {
                                        const isSelected = allocation?.budgetHeadId === head.id;
                                        const isInsufficient = (head.totalBalance || 0) < (parsedData.totalValue || 0);

                                        return (
                                            <div
                                                key={head.id}
                                                onClick={() => handleAllocationChange(head.id)}
                                                className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${isSelected
                                                    ? 'border-blue-600 bg-blue-50/50'
                                                    : 'border-gray-50 bg-gray-50 hover:border-gray-200'
                                                    } ${isInsufficient && !isSelected ? 'opacity-60' : ''}`}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-blue-600' : 'text-gray-400'}`}>
                                                            {head.code}
                                                        </p>
                                                        <h4 className="text-sm font-bold text-gray-800 line-clamp-1">{head.name}</h4>
                                                    </div>
                                                    {isSelected && <CheckCircle size={18} className="text-blue-600" />}
                                                </div>

                                                <div className="flex items-center justify-between mt-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-gray-400 uppercase">Available Balance</span>
                                                        <span className={`text-sm font-black ${isInsufficient ? 'text-red-600' : 'text-green-600'}`}>
                                                            ${head.totalBalance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                                        </span>
                                                    </div>
                                                    {isInsufficient && (
                                                        <span className="text-[9px] font-black bg-red-100 text-red-600 px-2 py-1 rounded uppercase">Insufficient</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                }
                                {budgetHeads.filter(h => !parsedData.departmentId || h.departmentId === parsedData.departmentId).length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <AlertTriangle size={40} className="mx-auto mb-3 text-gray-400" />
                                        <p className="text-sm font-bold">No Budget Heads found for this department.</p>
                                    </div>
                                )}
                            </div>

                            {/* Confirmation Footer */}
                            <div className="mt-6 pt-6 border-t border-gray-100">
                                {allocation?.budgetHeadId ? (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-center">
                                        <div className="flex-1">
                                            <p className="text-[10px] font-black text-blue-400 uppercase">Selected Target</p>
                                            <p className="text-sm font-black text-blue-700">{allocation.budgetHeadName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-blue-400 uppercase">PR Total</p>
                                            <p className="text-sm font-black text-blue-700">${parsedData.totalValue?.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-xs text-gray-400 mb-4 italic text-center">Please select a Budget Head from the list above to proceed.</p>
                                )}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!allocation?.budgetHeadId || allocation?.status === 'INSUFFICIENT'}
                                    className={`w-full flex items-center justify-center px-4 py-4 rounded-xl font-black uppercase tracking-widest text-xs transition-all ${(allocation?.budgetHeadId && allocation?.status !== 'INSUFFICIENT')
                                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Save size={18} className="mr-3" />
                                    Confirm PR Submission
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ─── Step 2: Send for Approval (shown after PR saved) ─── */}
                {approvalStep && (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-8">
                        {/* Header */}
                        <div style={{ background: 'linear-gradient(135deg,#1a56db,#1e429f)' }} className="p-6">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <UserCheck size={22} className="text-white" />
                                </div>
                                <div>
                                    <h3 className="text-white font-black text-lg">Send for Approval</h3>
                                    <p className="text-blue-100 text-xs mt-0.5">PR saved ✅ — Select approvers to notify via email</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6">
                            {approvers.length === 0 ? (
                                <div className="text-center py-10 text-gray-400">
                                    <AlertTriangle size={36} className="mx-auto mb-3" />
                                    <p className="font-semibold text-sm">No approvers configured.</p>
                                    <p className="text-xs mt-1">Go to <strong>Master Data → Approvers</strong> to add approvers first.</p>
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                                    {approvers.map(a => {
                                        const checked = selectedApproverIds.includes(a.id);
                                        return (
                                            <label
                                                key={a.id}
                                                onClick={() => handleToggleApprover(a.id)}
                                                className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${checked ? 'border-blue-600 bg-blue-50/60' : 'border-gray-100 bg-gray-50 hover:border-gray-200'
                                                    }`}
                                            >
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                                                    }`}>
                                                    {checked && <CheckCircle size={13} className="text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`font-bold text-sm ${checked ? 'text-blue-700' : 'text-gray-800'}`}>{a.name}</p>
                                                    <p className="text-xs text-gray-400">{a.email}{a.department ? ` · ${a.department.name}` : ''}</p>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}

                            <div className="mt-6 flex gap-3">
                                <button
                                    onClick={handleSendApproval}
                                    disabled={sendingApproval || selectedApproverIds.length === 0}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm uppercase tracking-widest transition-all ${selectedApproverIds.length > 0
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Send size={16} />
                                    {sendingApproval ? 'Sending...' : `Send to ${selectedApproverIds.length || 0} Approver${selectedApproverIds.length !== 1 ? 's' : ''}`}
                                </button>
                                <button
                                    onClick={handleSkipApproval}
                                    className="px-5 py-3.5 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm hover:bg-gray-50 transition-colors"
                                >
                                    Skip
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default PrUpload;
