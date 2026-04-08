import React, { useState, useEffect } from 'react';
import { User, Mail, Building2, UploadCloud, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../api/axios';

const ProfileSettings = () => {
    const [email, setEmail] = useState('');
    const [approver, setApprover] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!email) return;
        setLoading(true);
        setError('');
        setSuccess('');
        try {
            const res = await api.get(`/approvers/email/${email.trim()}`);
            setApprover(res.data);
            if (res.data.signaturePath) {
                setPreviewUrl(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/uploads/signatures/${res.data.signaturePath}`);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Profile not found. Please contact admin.');
            setApprover(null);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleUpdateProfile = async () => {
        if (!approver) return;
        setUploading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('name', approver.name);
        if (selectedFile) {
            formData.append('signature', selectedFile);
        }

        try {
            const res = await api.put(`/approvers/${approver.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setApprover(res.data.approver);
            setSuccess('Profile and signature updated successfully!');
            setSelectedFile(null);
        } catch (err) {
            setError('Failed to update profile.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto py-10 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <ShieldCheck className="text-blue-600" size={32} />
                    Approver Profile Settings
                </h1>
                <p className="text-gray-500 mt-2 font-medium">Manage your digital signature and profile information for PR approvals.</p>
            </div>

            {!approver ? (
                <div className="bg-white rounded-3xl shadow-xl shadow-blue-100/50 border border-blue-50 p-8 text-center">
                    <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <User size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-gray-800 mb-2">Find Your Profile</h2>
                    <p className="text-gray-500 mb-8 max-w-sm mx-auto">Enter your registered work email to access your profile and upload your signature.</p>
                    
                    <form onSubmit={handleLookup} className="max-w-md mx-auto flex flex-col gap-4">
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                placeholder="name@company.com"
                                className="w-full bg-gray-50 border-2 border-transparent focus:border-blue-600 focus:bg-white rounded-2xl pl-12 pr-4 py-4 text-gray-900 font-bold outline-none transition-all"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Access Profile'}
                        </button>
                        {error && (
                            <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-bold">
                                <AlertCircle size={16} /> {error}
                            </div>
                        )}
                    </form>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left: Info Card */}
                    <div className="md:col-span-1 space-y-6">
                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-black">
                                    {approver.name.charAt(0).toUpperCase()}
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">{approver.name}</h3>
                                <p className="text-gray-400 text-sm font-medium mb-4">{approver.email}</p>
                                
                                <div className="w-full pt-4 border-t border-gray-50 space-y-3">
                                    <div className="flex items-center gap-2 text-left">
                                        <Building2 size={14} className="text-gray-400" />
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-tight">
                                            {approver.department?.name || 'General Dept'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-left text-emerald-600">
                                        <CheckCircle2 size={14} />
                                        <span className="text-xs font-bold uppercase tracking-tight">Verified Approver</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => { setApprover(null); setEmail(''); setPreviewUrl(null); }}
                            className="w-full text-gray-400 hover:text-gray-600 font-bold text-sm transition-colors"
                        >
                            Switch Profile
                        </button>
                    </div>

                    {/* Right: Signature Upload */}
                    <div className="md:col-span-2">
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="p-8">
                                <h3 className="text-xl font-bold text-gray-800 mb-6 font-primary">Digital Signature</h3>
                                
                                <div className="space-y-8">
                                    <div>
                                        <p className="text-sm text-gray-500 mb-4 leading-relaxed font-medium">
                                            Upload a clear image of your handwritten signature. This will be automatically embedded in Excel Purchase Requisitions you approve. 
                                            <span className="text-blue-600 block mt-1">Recommended: JPG or PNG on white background.</span>
                                        </p>

                                        <div className="flex items-center justify-center w-full">
                                            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:bg-gray-50 hover:border-blue-400 transition-all bg-gray-50/50 group overflow-hidden relative">
                                                {previewUrl ? (
                                                    <img src={previewUrl} alt="Signature Preview" className="h-full w-full object-contain p-4" />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                                        <div className="p-4 bg-white rounded-2xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                                                            <UploadCloud className="text-blue-500" size={32} />
                                                        </div>
                                                        <p className="mb-2 text-sm text-gray-800 font-bold">Click to upload signature</p>
                                                        <p className="text-xs text-gray-400 font-medium">PNG, JPG or WEBP (Max 2MB)</p>
                                                    </div>
                                                )}
                                                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                            </label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-4">
                                        {success && (
                                            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
                                                <CheckCircle2 size={18} /> {success}
                                            </div>
                                        )}
                                        {error && (
                                            <div className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-2 text-sm font-bold animate-in fade-in slide-in-from-bottom-2">
                                                <AlertCircle size={18} /> {error}
                                            </div>
                                        )}
                                        
                                        <button
                                            onClick={handleUpdateProfile}
                                            disabled={uploading || (!selectedFile && approver.name === approver.name)} // Simplified
                                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest py-4 rounded-2xl shadow-xl shadow-blue-100 transition-all disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {uploading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                                    Processing...
                                                </span>
                                            ) : 'Save Signature & Profile'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileSettings;
