import React, { useState, useEffect } from 'react';
import { Users, Plus, Shield, XCircle } from 'lucide-react';
import api from '../api/axios';
import { TEAM_OPTIONS } from '../config/permissions';

const roleBadge = {
    ADMIN: { bg: '#fee2e2', color: '#dc2626' },
    MANAGER: { bg: '#dbeafe', color: '#1d4ed8' },
    OFFICER: { bg: '#d1fae5', color: '#059669' },
    VIEWER: { bg: '#f3f4f6', color: '#6b7280' },
};

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'OFFICER', team: 'GENERAL', department: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/users');
            setUsers(res.data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleCreate = async () => {
        if (!form.name || !form.email || !form.password) {
            setError('Name, email, and password are required.');
            return;
        }
        setSaving(true);
        setError('');
        try {
            await api.post('/auth/register', form);
            setShowCreate(false);
            setForm({ name: '', email: '', password: '', role: 'OFFICER', team: 'GENERAL', department: '' });
            fetchUsers();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to create user.');
        } finally { setSaving(false); }
    };

    const toggleActive = async (user) => {
        try {
            await api.patch(`/auth/users/${user.id}`, { isActive: !user.isActive });
            fetchUsers();
        } catch (e) { alert('Failed to update user.'); }
    };

    const changeRole = async (userId, newRole) => {
        try {
            await api.patch(`/auth/users/${userId}`, { role: newRole });
            fetchUsers();
        } catch (e) { alert('Failed to change role.'); }
    };

    const changeTeam = async (userId, newTeam) => {
        try {
            await api.patch(`/auth/users/${userId}`, { team: newTeam });
            fetchUsers();
        } catch (e) { alert('Failed to change team.'); }
    };

    if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tight">User Management</h2>
                    <p className="text-gray-500 font-medium">Manage system access and role assignments</p>
                </div>
                <button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center text-sm font-black uppercase tracking-wider transition-all shadow-lg shadow-blue-100">
                    <Plus size={18} className="mr-2" /> New User
                </button>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                {['Name', 'Email', 'Role', 'Team', 'Department', 'Status', 'Last Login'].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {users.map(u => {
                                const rb = roleBadge[u.role] || roleBadge.VIEWER;
                                return (
                                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm">
                                                    {u.name?.charAt(0).toUpperCase()}
                                                </div>
                                                <span className="text-sm font-bold text-gray-800">{u.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">{u.email}</td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={u.role}
                                                onChange={(e) => changeRole(u.id, e.target.value)}
                                                className="text-[10px] font-black px-2 py-1 rounded-full border-0 outline-none cursor-pointer"
                                                style={{ background: rb.bg, color: rb.color }}
                                            >
                                                {['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'].map(r => (
                                                    <option key={r} value={r}>{r}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4">
                                            <select
                                                value={u.team || 'GENERAL'}
                                                onChange={(e) => changeTeam(u.id, e.target.value)}
                                                className="text-[10px] font-black px-2 py-1 rounded-full border border-slate-200 outline-none cursor-pointer bg-slate-50 text-slate-700"
                                            >
                                                {TEAM_OPTIONS.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">{u.department || '—'}</td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => toggleActive(u)}
                                                className={`text-xs font-black px-3 py-1 rounded-full transition-colors ${u.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-red-50 hover:text-red-600' : 'bg-red-50 text-red-600 hover:bg-emerald-50 hover:text-emerald-600'}`}
                                            >
                                                {u.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-gray-400 font-medium">
                                            {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-IN') : 'Never'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Shield size={16} className="text-gray-300" />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreate && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 rounded-t-2xl flex justify-between items-center">
                            <h3 className="text-white font-black text-lg">Create New User</h3>
                            <button onClick={() => { setShowCreate(false); setError(''); }} className="text-white/70 hover:text-white"><XCircle size={22} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {error && <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100">{error}</div>}
                            {[
                                { label: 'Full Name *', key: 'name', type: 'text', placeholder: 'John Doe' },
                                { label: 'Email Address *', key: 'email', type: 'email', placeholder: 'john@company.com' },
                                { label: 'Password *', key: 'password', type: 'password', placeholder: '••••••••' },
                                { label: 'Department', key: 'department', type: 'text', placeholder: 'Mining Operations' },
                            ].map(f => (
                                <div key={f.key}>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{f.label}</label>
                                    <input
                                        type={f.type}
                                        placeholder={f.placeholder}
                                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:border-blue-400 transition-colors"
                                        value={form[f.key]}
                                        onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Role *</label>
                                <select
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none"
                                    value={form.role}
                                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                                >
                                    {['ADMIN', 'MANAGER', 'OFFICER', 'VIEWER'].map(r => (
                                        <option key={r} value={r}>{r}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Team Assignment *</label>
                                <select
                                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none"
                                    value={form.team}
                                    onChange={(e) => setForm({ ...form, team: e.target.value })}
                                >
                                    {TEAM_OPTIONS.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={handleCreate} disabled={saving} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest py-3 rounded-xl disabled:opacity-60">
                                    {saving ? 'Creating...' : 'Create User'}
                                </button>
                                <button onClick={() => { setShowCreate(false); setError(''); }} className="px-5 py-3 border-2 border-gray-200 rounded-xl text-gray-600 font-bold text-sm hover:bg-gray-50">Cancel</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
