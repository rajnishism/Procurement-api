import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, Briefcase, MapPin, Shield, CheckCircle2, 
    AlertCircle, UploadCloud, FileText, CheckCircle, BarChart3, 
    ArrowUpRight, Clock, ShieldCheck, UserCheck, Layers, Landmark
} from 'lucide-react';
import api from '../api/axios';
import { validateFile } from '../utils/fileValidation';
import { useAuth } from '../context/AuthContext';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
    CartesianGrid, Tooltip 
} from 'recharts';

const ProfileSettings = () => {
    const { user: authUser, refreshUser } = useAuth();
    const [profile, setProfile] = useState(null);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    // Form states
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        designation: '',
        location: '',
        employeeId: '',
        department: '',
        reportingManagerId: '',
    });

    useEffect(() => {
        fetchProfile();
        fetchManagers();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/auth/profile');
            setProfile(res.data);
            setFormData({
                name: res.data.name || '',
                email: res.data.email || '',
                phoneNumber: res.data.phoneNumber || '',
                designation: res.data.designation || '',
                location: res.data.location || '',
                employeeId: res.data.employeeId || '',
                department: res.data.department || '',
                reportingManagerId: res.data.reportingManagerId || '',
            });
            if (res.data.signaturePath) {
                setPreviewUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/uploads/signatures/${res.data.signaturePath}`);
            }
        } catch (err) {
            setError('Failed to load profile data.');
        } finally {
            setLoading(false);
        }
    };

    const fetchManagers = async () => {
        try {
            const res = await api.get('/auth/managers');
            setManagers(res.data);
        } catch (err) {
            console.error('Failed to load managers');
        }
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await api.put('/auth/profile', formData);
            await refreshUser();
            setSuccess('Profile updated successfully!');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to update profile.');
        } finally {
            setSaving(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validationError = validateFile(file, {
                maxSize: 2 * 1024 * 1024,
                isImageOnly: true
            });

            if (validationError) {
                setError(validationError);
                e.target.value = '';
                return;
            }

            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setError('');
        }
    };

    const handleUploadSignature = async () => {
        if (!selectedFile) return;
        setUploading(true);
        setError('');
        setSuccess('');

        const formDataFile = new FormData();
        formDataFile.append('signature', selectedFile);

        try {
            const res = await api.post('/auth/signature', formDataFile, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccess('Signature uploaded successfully!');
            setSelectedFile(null);
            if (res.data.signaturePath) {
                setPreviewUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/uploads/signatures/${res.data.signaturePath}`);
            }
            await refreshUser();
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError('Failed to upload signature.');
        } finally {
            setUploading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    const stats = profile?.stats || {};

    const permissionList = [
        { key: 'createPR', label: 'Create PR', active: ['INDENTOR', 'ADMIN'].includes(profile?.role) },
        { key: 'approvePR', label: 'Approve PR', active: ['APPROVER', 'ADMIN'].includes(profile?.role) },
        { key: 'viewFinancials', label: 'View Financials', active: ['ADMIN', 'PROCUREMENT'].includes(profile?.role) },
        { key: 'createPO', label: 'Create PO', active: ['PROCUREMENT', 'ADMIN'].includes(profile?.role) },
        { key: 'vendorMgmt', label: 'Vendor Management', active: ['PROCUREMENT', 'ADMIN'].includes(profile?.role) },
    ];

    return (
        <div className="max-w-7xl mx-auto py-10 px-4 sm:px-6 lg:px-8 space-y-10 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <UserCheck className="text-blue-600" size={36} />
                        Account Settings
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Manage your personal profile, role permissions, and digital authentication.</p>
                </div>
                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Clock size={20} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Last Login</p>
                        <p className="text-sm font-bold text-slate-700">{profile?.lastLogin ? new Date(profile.lastLogin).toLocaleString() : 'First time login'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Column 1: Basic Info & Profile Card */}
                <div className="lg:col-span-1 space-y-8">
                    {/* Compact Card with Profile Header */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden group">
                        <div className="h-32 bg-gradient-to-br from-blue-600 to-indigo-700 relative">
                            <div className="absolute -bottom-12 left-8 p-1 bg-white rounded-2xl shadow-lg">
                                <div className="w-20 h-20 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center text-3xl font-black border-2 border-slate-100">
                                    {profile?.name?.charAt(0).toUpperCase()}
                                </div>
                            </div>
                        </div>
                        <div className="pt-16 pb-8 px-8">
                            <h2 className="text-2xl font-black text-slate-900">{profile?.name}</h2>
                            <p className="text-slate-500 font-medium">{profile?.designation || 'Position not set'}</p>
                            
                            <div className="mt-6 flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    {profile?.role}
                                </span>
                                <span className={`px-3 py-1 ${profile?.isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'} rounded-full text-[10px] font-black uppercase tracking-widest border`}>
                                    {profile?.isActive ? 'Active Member' : 'Deactivated'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Stats Dashboard */}
                    <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100/50 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                <BarChart3 className="text-blue-600" size={20} />
                                User Summary
                            </h3>
                            <button className="text-blue-600 font-bold text-xs hover:underline flex items-center gap-1">
                                Full Reports <ArrowUpRight size={12} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">PR Raised</p>
                                <p className="text-2xl font-black text-slate-900">{stats.totalPrs || 0}</p>
                            </div>
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100/50">
                                <p className="text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1">Total Approved</p>
                                <p className="text-2xl font-black text-emerald-700">{stats.approvedPrs || 0}</p>
                            </div>
                            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100/50">
                                <p className="text-[10px] font-black text-amber-600/70 uppercase tracking-widest mb-1">Active PRs</p>
                                <p className="text-2xl font-black text-amber-700">{stats.pendingPrs || 0}</p>
                            </div>
                            <div className="bg-rose-50 p-4 rounded-2xl border border-rose-100/50">
                                <p className="text-[10px] font-black text-rose-600/70 uppercase tracking-widest mb-1">Pending Action</p>
                                <p className="text-2xl font-black text-rose-700">{stats.pendingApprovals || 0}</p>
                            </div>
                        </div>

                        {/* Mini Chart for Trend */}
                        {stats.trend && stats.trend.length > 0 && (
                            <div className="h-24 pt-4 border-t border-slate-50">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">6-Month Trend</p>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={stats.trend}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontWeight: 'bold', fontSize: '10px' }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Column 2: Edit Form & Employment */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Basic Information Form */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                            <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                <User className="text-blue-600" size={24} />
                                Basic Information
                            </h3>
                            <span className="text-xs font-bold text-slate-400">Section 1 of 5</span>
                        </div>
                        
                        <form onSubmit={handleUpdateProfile} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="name"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none transition-all"
                                            placeholder="Enter your full name"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none transition-all"
                                            placeholder="yourname@domain.com"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="phoneNumber"
                                            value={formData.phoneNumber}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none transition-all"
                                            placeholder="+91 XXXXX XXXXX"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Designation</label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="designation"
                                            value={formData.designation}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none transition-all"
                                            placeholder="e.g. Senior Procurement Manager"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Location / Site</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            name="location"
                                            value={formData.location}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none transition-all"
                                            placeholder="e.g. Mumbai HQ / Site B-12"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Reporting Manager</label>
                                    <div className="relative">
                                        <UserCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            name="reportingManagerId"
                                            value={formData.reportingManagerId}
                                            onChange={handleFormChange}
                                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-slate-900 font-bold outline-none appearance-none transition-all"
                                        >
                                            <option value="">Select Manager</option>
                                            {managers.map(m => (
                                                <option key={m.id} value={m.id}>{m.name} ({m.designation || 'Member'})</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center justify-end gap-4 pt-4 border-t border-slate-50">
                                {success && (
                                    <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm animate-in fade-in">
                                        <CheckCircle size={16} /> {success}
                                    </div>
                                )}
                                {error && (
                                    <div className="flex items-center gap-2 text-rose-600 font-bold text-sm animate-in fade-in">
                                        <AlertCircle size={16} /> {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="bg-blue-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest py-4 px-10 rounded-2xl shadow-xl shadow-blue-200 transition-all disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : 'Update Profile'}
                                </button>
                            </div>
                        </form>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Section 2: Role & Authority */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <ShieldCheck className="text-rose-600" size={20} />
                                    Role & Authority
                                </h3>
                                <div className="group relative">
                                    <AlertCircle size={16} className="text-slate-300 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-3 bg-slate-900 text-white text-[10px] rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold tracking-wide shadow-2xl">
                                        Contact Admin to request modifications to your role or permissions.
                                    </div>
                                </div>
                            </div>
                            <div className="p-6 space-y-6">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">System Role</p>
                                        <p className="text-base font-black text-slate-800">{profile?.role}</p>
                                    </div>
                                    <Shield className="text-slate-300" size={24} />
                                </div>
                                
                                <div className="space-y-3">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Active Permissions</p>
                                    {permissionList.map(perm => (
                                        <div key={perm.key} className="flex items-center justify-between text-sm">
                                            <span className={`font-bold ${perm.active ? 'text-slate-700' : 'text-slate-300'}`}>{perm.label}</span>
                                            {perm.active ? (
                                                <CheckCircle2 size={16} className="text-blue-500" />
                                            ) : (
                                                <div className="w-4 h-4 rounded-full border-2 border-slate-100" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Signature Section */}
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/20 flex items-center justify-between">
                                <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                                    <Landmark className="text-blue-600" size={20} />
                                    Digital Signature
                                </h3>
                                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase tracking-tighter">Secure Upload</span>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    This signature is used for authenticating PR/PO documents. Ensure it's clear and on a white background.
                                </p>
                                
                                <div className="relative group">
                                    <div className="w-full h-40 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center bg-slate-50 relative overflow-hidden group-hover:border-blue-400 transition-all">
                                        {previewUrl ? (
                                            <img src={previewUrl} className="max-w-[80%] max-h-[80%] object-contain" alt="Signature" />
                                        ) : (
                                            <div className="flex flex-col items-center">
                                                <UploadCloud className="text-slate-300 group-hover:text-blue-500 transition-colors" size={32} />
                                                <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Click to browse</p>
                                            </div>
                                        )}
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="absolute inset-0 opacity-0 cursor-pointer" 
                                            onChange={handleFileChange}
                                        />
                                    </div>
                                </div>

                                {selectedFile && (
                                    <button
                                        onClick={handleUploadSignature}
                                        disabled={uploading}
                                        className="w-full bg-slate-900 hover:bg-black text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl shadow-lg transition-all disabled:opacity-50"
                                    >
                                        {uploading ? 'Processing...' : 'Confirm Upload'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Section 5: Extra Details */}
                    <div className="bg-slate-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200/50 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl font-bold"></div>
                        <div className="relative z-10 flex flex-col gap-8">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <h3 className="text-2xl font-black tracking-tight flex items-center gap-3">
                                    <Landmark className="text-blue-400" size={28} />
                                    Extra Details
                                </h3>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 bg-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest border border-white/10">Section 5 of 5</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Employee ID</label>
                                    <input
                                        name="employeeId"
                                        value={formData.employeeId}
                                        onChange={handleFormChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:bg-white/10 focus:border-blue-400 transition-all placeholder:text-white/20"
                                        placeholder="e.g. ME-10023"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Department</label>
                                    <input
                                        name="department"
                                        value={formData.department}
                                        onChange={handleFormChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:bg-white/10 focus:border-blue-400 transition-all placeholder:text-white/20"
                                        placeholder="e.g. Procurement / IT"
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Reporting Manager</label>
                                    <select
                                        name="reportingManagerId"
                                        value={formData.reportingManagerId}
                                        onChange={handleFormChange}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white font-bold outline-none focus:bg-white/10 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="" className="text-slate-900 font-bold">Select Manager</option>
                                        {managers.map(mgr => (
                                            <option key={mgr.id} value={mgr.id} className="text-slate-900 font-bold">
                                                {mgr.name} ({mgr.email})
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-slate-400 mt-2 font-medium italic">* This selection determines your first level of approval hierarchy.</p>
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-white/10">
                                <button 
                                    onClick={handleUpdateProfile}
                                    disabled={saving}
                                    className="px-8 py-3 bg-white text-slate-900 rounded-xl font-black text-sm transition-all shadow-xl shadow-slate-900/50 hover:scale-105 active:scale-95 disabled:opacity-50"
                                >
                                    {saving ? 'Syncing...' : 'Save All Details'}
                                </button>
                                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-white transition-all backdrop-blur-sm">
                                    Change Password
                                </button>
                                <button className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold text-sm text-white transition-all backdrop-blur-sm">
                                    Enable 2FA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileSettings;
