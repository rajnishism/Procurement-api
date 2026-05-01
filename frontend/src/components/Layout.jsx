import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, PieChart, Database, Menu, FileSpreadsheet, FileText, ClipboardList, Package, Truck, FileCheck, CreditCard, Sparkles, ShieldCheck, Activity, Timer, FileSignature, User, Users, LogOut, ChevronRight, Hash, Bug, AlertTriangle, Bell, Clock, X as CloseIcon, BarChart3 } from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import { getAllowedPaths } from '../config/permissions';

const Layout = ({ children }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isSidebarVisible, setIsSidebarVisible] = useState(true);

    const [notifications, setNotifications] = useState([
        { id: 1, title: 'PR Approval Pending', desc: 'MMCL/MIN/MMA/PR-084 requires your Stage 1 approval.', time: '2 mins ago', type: 'urgent', icon: <Timer size={14} />, read: false },
        { id: 2, title: 'Budget Reached 90%', desc: 'Department: Mining has consumed 90.5% of monthly budget.', time: '1 hour ago', type: 'warning', icon: <Activity size={14} />, read: false },
        { id: 3, title: 'New Quotation Uploaded', desc: 'Vendor: Global Tools uploaded a technical offer for PR-083.', time: '4 hours ago', type: 'info', icon: <Package size={14} />, read: false }
    ]);

    const markAllRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const unreadCount = notifications.filter(n => !n.read).length;

    // Adjusted for light background in top nav
    const roleBadgeColorsLight = {
        ADMIN: 'bg-red-50 text-red-600 border border-red-100',
        MANAGER: 'bg-blue-50 text-blue-600 border border-blue-100',
        OFFICER: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        VIEWER: 'bg-gray-50 text-gray-600 border border-gray-200',
    };

    const sideNavSections = [
        {
            title: 'Reporting & Analysis',
            items: [
                { name: 'Dashboard', icon: LayoutDashboard, path: '/' },

                { name: 'Budget Hub', icon: PieChart, path: '/budget' },
                { name: 'Expense Audit', icon: Activity, path: '/expenses' },
            ]
        },
        {
            title: 'Purchase Requisitions',
            items: [
                { name: 'PR Generator', icon: Upload, path: '/upload-pr', roles: ['ADMIN', 'MANAGER', 'OFFICER'] },
                { name: 'PR Tracking', icon: ClipboardList, path: '/prs' },
            ]
        },
        {
            title: 'Purchase Orders',
            items: [
                { name: 'PO Generator', icon: Sparkles, path: '/po-generator', roles: ['ADMIN', 'MANAGER'] },
                { name: 'PO Tracking', icon: Package, path: '/pos' },
            ]
        },
        {
            title: 'Note for Approval',
            items: [
                { name: 'NFA Generator', icon: FileCheck, path: '/nfas', roles: ['ADMIN', 'MANAGER'] },
                { name: 'NFA Tracking', icon: ShieldCheck, path: '/nfahistory' },
            ]
        },
        {
            title: 'Approvals',
            items: [
                { name: 'My Approvals', icon: ShieldCheck, path: '/approvals' },
            ]
        },
        {
            title: 'Operations & Execution',
            items: [
                { name: 'GRN Log', icon: Truck, path: '/grns', roles: ['ADMIN', 'MANAGER', 'OFFICER'] },
                { name: 'Invoices', icon: FileSignature, path: '/invoices', roles: ['ADMIN', 'MANAGER'] },
                { name: 'Payments', icon: CreditCard, path: '/payments', roles: ['ADMIN', 'MANAGER'] },
            ]
        },
        {
            title: 'Administration',
            items: [
                { name: 'System Logs', icon: Activity, path: '/audit-logs', roles: ['ADMIN', 'MANAGER'] },
                { name: 'Master Data', icon: Database, path: '/master-data', roles: ['ADMIN', 'MANAGER'] },
                { name: 'Migration', icon: FileSpreadsheet, path: '/migration', roles: ['ADMIN'] },
                { name: 'User Management', icon: Users, path: '/users', roles: ['ADMIN'] },
                { name: 'System Profile', icon: User, path: '/profile' },
            ]
        }
    ];

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Sidebar Overlay */}
            <div
                className={`fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300 ${isSidebarVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsSidebarVisible(false)}
            />

            {/* Sidebar */}
            <aside className={`fixed md:relative top-0 left-0 h-full transition-all duration-300 ease-in-out z-50 ${isSidebarVisible ? 'w-64 translate-x-0' : 'w-0 -translate-x-full md:translate-x-0'} bg-slate-950 text-white flex flex-col border-r border-slate-800 overflow-hidden`}>
                <div className="w-64 flex flex-col h-full flex-shrink-0">
                    <div className="p-6 flex-shrink-0 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Package className="text-white" size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-tight whitespace-nowrap">
                                    ProcureMet
                                </h1>
                                <p className="text-[10px] font-black tracking-widest text-blue-400 whitespace-nowrap">Simple.Fast.Reliable</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsSidebarVisible(false)}
                            className="md:hidden p-2 text-slate-400 hover:text-white transition-colors"
                        >
                            <CloseIcon size={20} />
                        </button>
                    </div>

                    <nav className="mt-2 px-3 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                        {sideNavSections.map((section, si) => {
                            const allowedPaths = getAllowedPaths(user);
                            const visibleItems = section.items.filter(item => {
                                if (item.roles && (!user || !item.roles.includes(user.role))) return false;
                                if (allowedPaths !== null && !allowedPaths.includes(item.path)) return false;
                                return true;
                            });
                            if (visibleItems.length === 0) return null;

                            return (
                                <div key={si} className="mb-6">
                                    {section.title && (
                                        <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">{section.title}</p>
                                    )}
                                    {visibleItems.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (
                                            <Link
                                                key={item.path}
                                                to={item.path}
                                                onClick={() => window.innerWidth < 768 && setIsSidebarVisible(false)}
                                                className={`flex items-center justify-between group px-4 py-2.5 mb-1 rounded-xl transition-all text-sm whitespace-nowrap ${isActive
                                                    ? 'bg-blue-600/10 text-blue-400 font-bold border border-blue-500/20 shadow-[0_0_15px_-5px_rgba(37,99,235,0.4)]'
                                                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                                                    }`}
                                            >
                                                <div className="flex items-center">
                                                    <Icon size={17} className={`mr-3 transition-colors ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                                    {item.name}
                                                </div>
                                                {isActive && <ChevronRight size={14} className="text-blue-400" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            );
                        })}
                    </nav>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* 🚀 TOP NAVIGATION BAR */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center justify-between px-4 md:px-8 flex-shrink-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsSidebarVisible(!isSidebarVisible)}
                            className="p-2.5 rounded-xl hover:bg-slate-100 transition-all text-slate-500 flex items-center justify-center border border-transparent hover:border-slate-200 group active:scale-95"
                            title={isSidebarVisible ? "Hide Sidebar" : "Show Sidebar"}
                        >
                            <Menu size={20} className={`transition-transform duration-300 ${isSidebarVisible ? 'rotate-0' : 'rotate-90'}`} />
                        </button>

                        {(window.innerWidth < 768 || !isSidebarVisible) && (
                            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-4 duration-300">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                                    <Package className="text-white" size={20} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-500 to-slate-200 leading-tight whitespace-nowrap">
                                        ProcureMet
                                    </h1>
                                    <p className="text-[10px] font-black tracking-widest text-blue-400 whitespace-nowrap">Simple.Fast.Reliable</p>
                                </div>
                                <span className="font-black text-slate-800 text-sm tracking-tight uppercase hidden xs:block">MMC LOG</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-5">


                        <button
                            onClick={() => setFeedbackOpen(true)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <Bug size={14} />
                            <span className="hidden sm:inline">Report Issue</span>
                        </button>

                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                className={`p-2.5 rounded-xl transition-all flex items-center justify-center border group active:scale-95 ${isNotificationsOpen ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'hover:bg-slate-100 text-slate-500 border-transparent hover:border-slate-200'}`}
                            >
                                <div className="relative">
                                    <Bell size={20} className={isNotificationsOpen ? 'animate-none' : 'group-hover:animate-bounce'} />
                                    {unreadCount > 0 && (
                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-indigo-600 border-[2.5px] border-white rounded-full flex items-center justify-center">
                                            <span className="text-[7px] text-white font-black">{unreadCount}</span>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {/* Notifications Panel Dropdown */}
                            {isNotificationsOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} />
                                    <div className="absolute right-0 mt-3 w-80 bg-white rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <div className="p-6 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between">
                                            <div>
                                                <h3 className="font-black text-slate-800 text-sm tracking-tight">Recent Activity</h3>
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{unreadCount} New Alerts Today</p>
                                            </div>
                                            {unreadCount > 0 && (
                                                <button
                                                    onClick={markAllRead}
                                                    className="text-[9px] font-black text-indigo-600 hover:text-indigo-800 uppercase tracking-widest"
                                                >
                                                    Mark All Read
                                                </button>
                                            )}
                                        </div>

                                        <div className="max-h-[360px] overflow-y-auto p-3 space-y-1 custom-scrollbar">
                                            {notifications.map(notif => (
                                                <Link
                                                    key={notif.id}
                                                    to="/notifications"
                                                    onClick={() => {
                                                        markAsRead(notif.id);
                                                        setIsNotificationsOpen(false);
                                                    }}
                                                    className={`block p-4 rounded-2xl hover:bg-slate-50 transition-colors group cursor-pointer border border-transparent hover:border-slate-100 ${!notif.read ? 'bg-indigo-50/10' : 'opacity-60'}`}
                                                >
                                                    <div className="flex gap-4">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm relative ${notif.type === 'urgent' ? 'bg-red-50 text-red-600' :
                                                            notif.type === 'warning' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                                            }`}>
                                                            {notif.icon}
                                                            {!notif.read && <div className="absolute top-0 right-0 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white" />}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="text-xs font-black text-slate-800 tracking-tight">{notif.title}</h4>
                                                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                                                    <Clock size={10} />
                                                                    {notif.time}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed line-clamp-2">{notif.desc}</p>
                                                        </div>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-slate-950 text-center">
                                            <Link
                                                to="/notifications"
                                                onClick={() => setIsNotificationsOpen(false)}
                                                className="text-[10px] font-black text-white uppercase tracking-[.25em] hover:text-blue-400 transition-colors w-full flex items-center justify-center gap-2 group"
                                            >
                                                <span>View Full Audit Log</span>
                                                <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                            </Link>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="h-6 w-[1px] bg-gray-200"></div>

                        {/* Profile Info and Terminate Session */}
                        {user && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 text-right">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800 leading-tight">{user.name}</span>

                                    </div>
                                    <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white font-black text-sm relative shadow-md">
                                        {user.name?.charAt(0).toUpperCase()}
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[2px] border-white rounded-full"></div>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsLogoutModalOpen(true)}
                                    className="flex items-center gap-1.5 px-1.5 py-2 rounded-lg bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 text-red-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                >
                                    <LogOut size={19} />

                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-[#fafafa]">
                    <div className={`${isSidebarVisible ? 'max-w-7xl px-4 md:px-8' : 'max-w-full px-4 md:px-12'} mx-auto py-8 transition-all duration-300`}>
                        {children}
                    </div>
                </main>
            </div>
            <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

            {/* Logout Confirmation Modal */}
            {isLogoutModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setIsLogoutModalOpen(false)}
                    />
                    <div className="relative bg-white w-full max-w-sm rounded-[24px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <AlertTriangle size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-800 mb-2">Confirm Logout</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                Are you sure you want to terminate your session? You will need to log in again to access the portal.
                            </p>
                        </div>
                        <div className="flex p-6 pt-0 gap-3">
                            <button
                                onClick={() => setIsLogoutModalOpen(false)}
                                className="flex-1 py-3.5 px-6 bg-slate-50 text-slate-600 rounded-xl font-black text-xs hover:bg-slate-100 transition-all active:scale-95 border border-slate-100"
                            >
                                CANCEL
                            </button>
                            <button
                                onClick={logout}
                                className="flex-1 py-3.5 px-6 bg-red-600 text-white rounded-xl font-black text-xs shadow-lg shadow-red-200 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                <LogOut size={14} />
                                LOGOUT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
