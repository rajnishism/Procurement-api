import React, { useState, useEffect } from 'react';
import { Database, Plus, X, Trash2, UserCheck, Building2, ToggleLeft, ToggleRight } from 'lucide-react';
import api from '../api/axios';

const MasterData = () => {
    const [departments, setDepartments] = useState([]);
    const [budgetHeads, setBudgetHeads] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('budgetHeads'); // budgetHeads | approvers | vendors

    // Filter state
    const [filterDeptId, setFilterDeptId] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: '', code: '', departmentId: '', email: '' });

    // Approver form state
    const [approverForm, setApproverForm] = useState({ name: '', email: '', departmentId: '' });
    const [approverError, setApproverError] = useState('');
    const [approverSaving, setApproverSaving] = useState(false);

    // Vendor form state
    const [vendorForm, setVendorForm] = useState({ name: '', code: '', email: '', phone: '', address: '', gstin: '', pan: '', category: 'GOODS' });
    const [vendorError, setVendorError] = useState('');
    const [vendorSaving, setVendorSaving] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [deptRes, wbsRes, approverRes, vendorRes] = await Promise.all([
                api.get('/master-data/departments'),
                api.get('/master-data/wbs'),
                api.get('/master-data/approvers'),
                api.get('/master-data/vendors?includeInactive=true'),
            ]);

            setDepartments(deptRes.data);
            
            // Flatten full hierarchy from config into the list frontend expects
            const flattenedWbs = [];
            wbsRes.data.forEach(dept => {
                dept.categories.forEach(cat => {
                    flattenedWbs.push({
                        id: `${dept.department}-${cat.category}`,
                        name: cat.category,
                        code: cat.wbsCodes.join(', '),
                        department: { name: dept.department },
                        departmentId: deptRes.data.find(d => d.name === dept.department)?.id,
                        totalBalance: 0 // Placeholder until balance sync is fixed or used
                    });
                });
            });
            setBudgetHeads(flattenedWbs);
            setApprovers(approverRes.data);
            setVendors(vendorRes.data);
        } catch (error) {
            console.error('Failed to fetch master data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = () => {
        setFormData({ name: '', code: '', departmentId: '' });
        setIsModalOpen(true);
    };

    const handleSave = async () => {
        try {
            await api.post('/master-data/budget-heads', {
                name: formData.name,
                code: formData.code,
                departmentId: formData.departmentId
            });
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Failed to save', error);
            alert('Failed to save data. Please try again.');
        }
    };

    const handleDelete = async (id, type) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            if (type === 'departments') await api.delete(`/master-data/departments/${id}`);
            fetchData();
        } catch (error) {
            console.error('Failed to delete', error);
            alert('Failed to delete record. Ensure no budget heads are linked to it.');
        }
    };

    const handleAddApprover = async () => {
        setApproverError('');
        if (!approverForm.name.trim() || !approverForm.email.trim()) {
            setApproverError('Name and email are required.');
            return;
        }
        setApproverSaving(true);
        try {
            await api.post('/master-data/approvers', {
                name: approverForm.name.trim(),
                email: approverForm.email.trim(),
                departmentId: approverForm.departmentId || null,
            });
            setApproverForm({ name: '', email: '', departmentId: '' });
            fetchData();
        } catch (err) {
            setApproverError(err.response?.data?.error || 'Failed to add approver.');
        } finally {
            setApproverSaving(false);
        }
    };

    const handleDeleteApprover = async (id) => {
        if (!window.confirm('Delete this approver?')) return;
        try {
            await api.delete(`/master-data/approvers/${id}`);
            fetchData();
        } catch (err) {
            alert('Failed to delete approver.');
        }
    };

    const handleAddVendor = async () => {
        setVendorError('');
        if (!vendorForm.name.trim() || !vendorForm.code.trim() || !vendorForm.email.trim()) {
            setVendorError('Name, code, and email are required.');
            return;
        }
        setVendorSaving(true);
        try {
            await api.post('/master-data/vendors', vendorForm);
            setVendorForm({ name: '', code: '', email: '', phone: '', address: '', gstin: '', pan: '', category: 'GOODS' });
            fetchData();
        } catch (err) {
            setVendorError(err.response?.data?.error || 'Failed to add vendor.');
        } finally {
            setVendorSaving(false);
        }
    };

    const handleToggleVendor = async (vendor) => {
        try {
            await api.patch(`/master-data/vendors/${vendor.id}`, { isActive: !vendor.isActive });
            fetchData();
        } catch (err) {
            alert('Failed to update vendor.');
        }
    };

    // ── Tabs config ──
    const tabs = [
        { key: 'budgetHeads', label: 'Budget Heads (WBS)', icon: <Database size={14} /> },
        { key: 'approvers', label: 'Approvers', icon: <UserCheck size={14} /> },
        { key: 'vendors', label: 'Vendors', icon: <Building2 size={14} /> },
    ];

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-black text-gray-800 tracking-tight">Master Data Management</h2>
                {activeTab === 'budgetHeads' && (
                    <button
                        onClick={handleOpenModal}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100"
                    >
                        <Plus size={18} className="mr-2" />
                        New WBS Code
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-2 mb-6">
                <div className="flex space-x-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`pb-2 px-4 font-black uppercase text-xs tracking-widest transition-colors flex items-center gap-1.5 ${activeTab === tab.key ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            {tab.icon}{tab.label}
                        </button>
                    ))}
                </div>

                {activeTab === 'budgetHeads' && (
                    <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase mr-3">Filter Dept:</span>
                        <select
                            className="bg-transparent text-sm font-bold text-gray-700 outline-none"
                            value={filterDeptId}
                            onChange={(e) => setFilterDeptId(e.target.value)}
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : (
                <>
                    {/* ── Budget Heads Tab ── */}
                    {activeTab === 'budgetHeads' && (
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 font-black text-gray-500 uppercase tracking-widest text-[10px]">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Description</th>
                                        <th className="px-6 py-4 text-left">WBS Code</th>
                                        <th className="px-6 py-4 text-left">Department</th>
                                        <th className="px-6 py-4 text-right">Available Balance</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {budgetHeads
                                        .filter(head => !filterDeptId || head.departmentId === filterDeptId)
                                        .map((head) => (
                                            <tr key={head.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-sm font-bold text-gray-900">{head.name}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="text-xs font-mono font-black text-blue-700 bg-blue-50/50 px-2 py-1 rounded inline-block border border-blue-100">{head.code}</div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{head.department?.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                                    <div className={`font-black ${head.totalBalance < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                                                        ₹{(Number(head.totalBalance) || 0).toLocaleString('en-IN')}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                    {budgetHeads.length === 0 && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-400 italic font-medium">
                                                No WBS data found. Click "New WBS Code" to start.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Approvers Tab ── */}
                    {activeTab === 'approvers' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Add Form */}
                            <div className="lg:col-span-1">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Plus size={16} className="text-blue-600" /> Add Approver
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name *</label>
                                            <input
                                                type="text"
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. Rajesh Kumar"
                                                value={approverForm.name}
                                                onChange={e => setApproverForm({ ...approverForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Email *</label>
                                            <input
                                                type="email"
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                                placeholder="e.g. rajesh@company.com"
                                                value={approverForm.email}
                                                onChange={e => setApproverForm({ ...approverForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Department (optional)</label>
                                            <select
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={approverForm.departmentId}
                                                onChange={e => setApproverForm({ ...approverForm, departmentId: e.target.value })}
                                            >
                                                <option value="">— No department —</option>
                                                {departments.map(d => (
                                                    <option key={d.id} value={d.id}>{d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        {approverError && (
                                            <p className="text-red-600 text-xs font-semibold">{approverError}</p>
                                        )}
                                        <button
                                            onClick={handleAddApprover}
                                            disabled={approverSaving}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-60"
                                        >
                                            <UserCheck size={15} />
                                            {approverSaving ? 'Saving...' : 'Add Approver'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Approvers List */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Registered Approvers</h3>
                                        <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{approvers.length} total</span>
                                    </div>
                                    <div className="divide-y divide-gray-100">
                                        {approvers.length === 0 && (
                                            <div className="py-12 text-center text-gray-400">
                                                <UserCheck size={36} className="mx-auto mb-3 opacity-40" />
                                                <p className="font-semibold text-sm">No approvers yet. Add one to get started.</p>
                                            </div>
                                        )}
                                        {approvers.map(a => (
                                            <div key={a.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-sm flex-shrink-0">
                                                        {a.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-gray-900">{a.name}</p>
                                                        <p className="text-xs text-gray-400">{a.email}{a.department ? ` · ${a.department.name}` : ''}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteApprover(a.id)}
                                                    className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Vendors Tab ── */}
                    {activeTab === 'vendors' && (
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                            {/* Add Vendor Form */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                                    <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Plus size={16} className="text-blue-600" /> Add Vendor
                                    </h3>
                                    <div className="space-y-3">
                                        {[{ label: 'Vendor Name *', key: 'name', placeholder: 'e.g. ABC Supplies Ltd.' },
                                        { label: 'Vendor Code *', key: 'code', placeholder: 'e.g. VND001', upper: true },
                                        { label: 'Email *', key: 'email', placeholder: 'e.g. contact@abcsupplies.com', type: 'email' },
                                        { label: 'Phone', key: 'phone', placeholder: 'e.g. +91 98765 43210' },
                                        { label: 'GSTIN', key: 'gstin', placeholder: 'e.g. 27AAPFU0939F1ZV', upper: true },
                                        { label: 'PAN', key: 'pan', placeholder: 'e.g. AAPFU0939F', upper: true },
                                        ].map(f => (
                                            <div key={f.key}>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</label>
                                                <input
                                                    type={f.type || 'text'}
                                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder={f.placeholder}
                                                    value={vendorForm[f.key]}
                                                    onChange={e => setVendorForm({ ...vendorForm, [f.key]: f.upper ? e.target.value.toUpperCase() : e.target.value })}
                                                />
                                            </div>
                                        ))}
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                                            <select
                                                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={vendorForm.category}
                                                onChange={e => setVendorForm({ ...vendorForm, category: e.target.value })}
                                            >
                                                <option value="GOODS">Goods</option>
                                                <option value="SERVICES">Services</option>
                                                <option value="BOTH">Both</option>
                                            </select>
                                        </div>
                                        {vendorError && <p className="text-red-600 text-xs font-semibold">{vendorError}</p>}
                                        <button
                                            onClick={handleAddVendor}
                                            disabled={vendorSaving}
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-60"
                                        >
                                            <Building2 size={15} />
                                            {vendorSaving ? 'Saving...' : 'Add Vendor'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Vendor List */}
                            <div className="lg:col-span-3">
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                                        <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest">Registered Vendors</h3>
                                        <span className="text-xs font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-full">{vendors.length} total</span>
                                    </div>
                                    {vendors.length === 0 ? (
                                        <div className="py-12 text-center text-gray-400">
                                            <Building2 size={36} className="mx-auto mb-3 opacity-40" />
                                            <p className="font-semibold text-sm">No vendors yet. Add one to get started.</p>
                                        </div>
                                    ) : (
                                        <table className="min-w-full divide-y divide-gray-100 text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Vendor</th>
                                                    <th className="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                                    <th className="px-5 py-3 text-left text-[9px] font-black text-gray-400 uppercase tracking-widest">GSTIN</th>
                                                    <th className="px-5 py-3 text-right text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {vendors.map(v => (
                                                    <tr key={v.id} className={`hover:bg-gray-50 transition-colors ${!v.isActive ? 'opacity-50' : ''}`}>
                                                        <td className="px-5 py-3">
                                                            <p className="font-bold text-gray-900">{v.name}</p>
                                                            <p className="text-[10px] text-gray-400 font-mono">{v.code} · {v.email}</p>
                                                            {v.phone && <p className="text-[10px] text-gray-400">{v.phone}</p>}
                                                        </td>
                                                        <td className="px-5 py-3">
                                                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{v.category}</span>
                                                        </td>
                                                        <td className="px-5 py-3 text-xs text-gray-500 font-mono">{v.gstin || '—'}</td>
                                                        <td className="px-5 py-3 text-right">
                                                            <button
                                                                onClick={() => handleToggleVendor(v)}
                                                                title={v.isActive ? 'Deactivate' : 'Activate'}
                                                                className="p-1.5 rounded-lg transition-colors hover:bg-gray-100"
                                                            >
                                                                {v.isActive
                                                                    ? <ToggleRight size={22} className="text-emerald-500" />
                                                                    : <ToggleLeft size={22} className="text-gray-400" />}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Add Budget Head Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-800">Add New Budget Head</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Explosives"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                                <input
                                    type="text"
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                    placeholder="e.g. EXP"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <select
                                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={formData.departmentId}
                                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                                >
                                    <option value="">Select Department</option>
                                    {departments.map(dept => (
                                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                                    ))}
                                </select>
                            </div>

                            <button
                                onClick={handleSave}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg mt-2 transition-colors"
                            >
                                Save Record
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MasterData;
