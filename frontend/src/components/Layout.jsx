import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LayoutDashboard, Upload, PieChart, Database, Menu, FileSpreadsheet, FileText, ClipboardList, Package, Truck, FileCheck, CreditCard, Sparkles, ShieldCheck, Activity, Timer, FileSignature, User, Users, LogOut, ChevronRight, Hash, Bug } from 'lucide-react';
import FeedbackModal from './FeedbackModal';
import { getAllowedPaths } from '../config/permissions';

const Layout = ({ children }) => {
    const location = useLocation();
    const { user, logout } = useAuth();
    const [feedbackOpen, setFeedbackOpen] = useState(false);

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
                { name: 'PR History', icon: ClipboardList, path: '/prs' },
                { name: 'PR Tracker', icon: FileText, path: '/pr-tracker' },
            ]
        },
        {
            title: 'Purchase Orders',
            items: [
                { name: 'PO Generator', icon: Sparkles, path: '/po-generator', roles: ['ADMIN', 'MANAGER'] },
                { name: 'PO History', icon: Package, path: '/pos' },
                { name: 'PO Tracker', icon: FileSpreadsheet, path: '/po-tracker' },
            ]
        },
        {
            title: 'Note for Approval',
            items: [
                { name: 'NFA Generator', icon: FileCheck, path: '/nfas', roles: ['ADMIN', 'MANAGER'] },
                { name: 'NFA History', icon: ShieldCheck, path: '/nfahistory' },
                { name: 'NFA Tracker', icon: Timer, path: '/nfatracker' },
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
            {/* Sidebar */}
            <aside className="w-64 bg-slate-950 text-white hidden md:flex flex-col border-r border-slate-800">
                <div className="p-6 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Hash className="text-white" size={20} />
                        </div>
                        <div>
                            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 leading-tight">
                                MMC LOG
                            </h1>
                            <p className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Procurement</p>
                        </div>
                    </div>
                </div>

                <nav className="mt-2 px-3 flex-1 overflow-y-auto pb-4 custom-scrollbar">
                    {sideNavSections.map((section, si) => {
                        const allowedPaths = getAllowedPaths(user);
                        const visibleItems = section.items.filter(item => {
                            // Role check (existing)
                            if (item.roles && (!user || !item.roles.includes(user.role))) return false;
                            // Team check (new) — null means show all
                            if (allowedPaths !== null && !allowedPaths.includes(item.path)) return false;
                            return true;
                        });
                        if (visibleItems.length === 0) return null;

                        return (
                            <div key={si} className="mb-6">
                                {section.title && (
                                    <p className="px-4 mb-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">{section.title}</p>
                                )}
                                {visibleItems.map((item) => {
                                    const Icon = item.icon;
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={`flex items-center justify-between group px-4 py-2.5 mb-1 rounded-xl transition-all text-sm ${isActive
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
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* 🚀 TOP NAVIGATION BAR */}
                <header className="bg-white/80 backdrop-blur-xl border-b border-gray-100 h-16 flex items-center justify-between px-8 flex-shrink-0 z-10">
                    <div className="flex items-center gap-6">
                        <Menu size={20} className="text-slate-400 md:hidden cursor-pointer" />
                    </div>

                    <div className="flex items-center gap-5">


                        <button 
                            onClick={() => setFeedbackOpen(true)} 
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <Bug size={14} />
                            <span className="hidden sm:inline">Report Issue</span>
                        </button>

                        <div className="h-6 w-[1px] bg-gray-200"></div>

                        {/* Profile Info and Terminate Session */}
                        {user && (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 text-right">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-black text-slate-800 leading-tight">{user.name}</span>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md inline-block mt-0.5 w-max ml-auto ${roleBadgeColorsLight[user.role] || 'bg-gray-100 text-gray-500'}`}>
                                            {user.role}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm relative shadow-md">
                                        {user.name?.charAt(0).toUpperCase()}
                                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-[2px] border-white rounded-full"></div>
                                    </div>
                                </div>
                                <button
                                    onClick={logout}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 hover:bg-red-600 border border-red-100 hover:border-red-600 text-red-600 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                                >
                                    <LogOut size={14} />
                                    <span className="hidden sm:inline">Log Out</span>
                                </button>
                            </div>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto bg-[#fafafa]">
                    <div className="max-w-7xl mx-auto p-8">
                        {children}
                    </div>
                </main>
            </div>
            <FeedbackModal isOpen={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
        </div>
    );
};

export default Layout;
