import React, { useState, useEffect } from 'react';
import { Bell, Clock, Timer, Activity, Package, CheckCircle2, AlertCircle, Search, Filter, Trash2, ChevronRight, ArrowRight, ShieldCheck, Mail, FileText } from 'lucide-react';
import api from '../api/axios';

const Notifications = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'URGENT' | 'WARNING' | 'INFO'
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        fetchNotifications();
    }, []);

    const fetchNotifications = async () => {
        try {
            setLoading(true);
            const response = await api.get('/notifications');
            // Format incoming data to match UI expectations if needed
            const formatted = response.data.map(n => ({
                ...n,
                // Map icons based on category or type
                icon: getIcon(n.category, n.type),
                time: formatTime(n.createdAt),
                date: new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                desc: n.message // Map message to desc for UI
            }));
            setNotifications(formatted);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (category, type) => {
        if (type === 'URGENT') return <AlertCircle size={20} />;
        if (category === 'Feedback') return <Mail size={20} />;
        if (category === 'Approval') return <ShieldCheck size={20} />;
        if (category === 'Budget') return <Activity size={20} />;
        return <Bell size={20} />;
    };

    const formatTime = (dateStr) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    };


    const filteredNotifications = notifications.filter(n => {
        const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.desc.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'ALL' || n.type === filterType;
        return matchesSearch && matchesType;
    });

    const markAllRead = async () => {
        try {
            await api.post('/notifications/read-all');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error('Error marking all read:', error);
        }
    };

    const toggleRead = async (id) => {
        try {
            const notif = notifications.find(n => n.id === id);
            if (!notif.read) {
                await api.patch(`/notifications/${id}/read`);
                setNotifications(notifications.map(n => 
                    n.id === id ? { ...n, read: true } : n
                ));
            }
        } catch (error) {
            console.error('Error toggling read status:', error);
        }
    };

    const deleteNotification = async (id) => {
        try {
            await api.delete(`/notifications/${id}`);
            setNotifications(notifications.filter(n => n.id !== id));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const getStatusStyle = (type) => {
        switch (type) {
            case 'URGENT': 
            case 'BUG_REPORT':
                return 'bg-red-50 text-red-600 border-red-100';
            case 'WARNING': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'INFO': return 'bg-blue-50 text-blue-600 border-blue-100';
            default: return 'bg-slate-50 text-slate-600 border-slate-100';
        }
    };


    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight flex items-center">
                        <Bell className="mr-4 text-indigo-600" size={36} />
                        Notifications Center
                    </h2>
                    <p className="text-slate-500 mt-2 font-medium">
                        Detailed audit trail of all alerts and PR activity for your account.
                    </p>
                </div>
                
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={markAllRead}
                        className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 hover:text-indigo-600 transition-all flex items-center gap-2 active:scale-95 shadow-sm"
                    >
                        <CheckCircle2 size={16} />
                        Mark All Read
                    </button>
                    <button className="px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 active:scale-95 shadow-lg shadow-slate-200">
                        <Filter size={16} />
                        Preferences
                    </button>
                </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                        type="text"
                        placeholder="Search alerts by PR number, department, or content..."
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-none rounded-2xl text-sm font-semibold focus:ring-4 focus:ring-indigo-50 transition-all outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                
                <div className="flex items-center p-1.5 bg-slate-100 rounded-2xl">
                    {['ALL', 'URGENT', 'WARNING', 'INFO'].map(type => (
                        <button
                            key={type}
                            onClick={() => setFilterType(type)}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black transition-all ${filterType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
            </div>

            {/* Notification List */}
            <div className="space-y-4">
                {filteredNotifications.length > 0 ? (
                    filteredNotifications.map((notif, index) => (
                        <div 
                            key={notif.id}
                            onClick={() => !notif.read && toggleRead(notif.id)}
                            style={{ animationDelay: `${index * 50}ms` }}
                            className={`group relative bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 cursor-pointer ${!notif.read ? 'ring-2 ring-indigo-500/10' : 'opacity-75'}`}
                        >
                            <div className="flex gap-6">
                                {/* Icon Badge */}
                                <div className={`w-16 h-16 rounded-[22px] flex items-center justify-center flex-shrink-0 shadow-lg ${getStatusStyle(notif.type)} shadow-${notif.type.toLowerCase()}-100 transition-transform group-hover:scale-110 duration-500`}>
                                    {notif.icon}
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${getStatusStyle(notif.type)}`}>
                                                {notif.type}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                                                {notif.category}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-2 md:mt-0">
                                            <div className="flex items-center text-[10px] font-bold text-slate-400 space-x-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-100">
                                                <Clock size={12} />
                                                <span>{notif.date} • {notif.time}</span>
                                            </div>
                                            {!notif.read && (
                                                <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.6)]" />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <h4 className="text-xl font-black text-slate-800 tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">{notif.title}</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-2xl">{notif.desc}</p>
                                    
                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-700 hover:bg-slate-900 hover:text-white rounded-xl text-xs font-black transition-all group/btn active:scale-95">
                                            VIEW DETAILS
                                            <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
                                        </button>
                                        {notif.type === 'URGENT' && (
                                            <button className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95">
                                                APPROVE NOW
                                            </button>
                                        )}
                                        <div className="ml-auto flex items-center gap-2">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleRead(notif.id);
                                                }}
                                                className={`p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${notif.read ? 'text-indigo-600 bg-indigo-50' : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'}`}
                                                title={notif.read ? "Mark as unread" : "Mark as read"}
                                            >
                                                <CheckCircle2 size={18} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteNotification(notif.id);
                                                }}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                                title="Delete alert"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="bg-white border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Bell size={40} className="text-slate-200" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800 mb-2">Inbox is Clear</h3>
                        <p className="text-slate-400 font-medium">We couldn't find any notifications matching your filters.</p>
                        <button 
                            onClick={() => { setFilterType('ALL'); setSearchTerm(''); }}
                            className="mt-8 text-indigo-600 font-black text-[10px] uppercase tracking-widest hover:text-indigo-800 transition-colors"
                        >
                            Reset All Filters
                        </button>
                    </div>
                )}
            </div>
            
            {/* Load More Mock */}
            {filteredNotifications.length > 0 && (
                <div className="flex justify-center pt-8 pb-12">
                    <button className="px-8 py-4 bg-white border border-slate-100 rounded-3xl text-sm font-black text-slate-800 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center gap-3 shadow-xl shadow-slate-200/50 group active:scale-95">
                        <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center group-hover:animate-spin">
                            <Clock size={12} className="text-slate-500" />
                        </div>
                        LOAD HISTORICAL ALERTS
                    </button>
                </div>
            )}
        </div>
    );
};

export default Notifications;
