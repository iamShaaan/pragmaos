import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Bell, Search, Menu, CheckCircle2, Clock } from 'lucide-react';
import { useAppStore } from '../../store';
import { useNotifications } from '../notifications/NotificationProvider';
import { formatDistanceToNow } from 'date-fns';

const PAGE_TITLES: Record<string, string> = {
    '/': 'Dashboard',
    '/tasks': 'Tasks',
    '/meetings': 'Meetings',
    '/clients': 'Clients',
    '/projects': 'Projects',
    '/notes': 'Notes & Vault',
    '/files': 'Files',
    '/profile': 'My Profile',
    '/routine': 'Checklist',
};

export const AppShell: React.FC = () => {
    const location = useLocation();
    const { sidebarOpen, setSidebarOpen } = useAppStore();
    const { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission, permissionGranted } = useNotifications();
    const [showNotifications, setShowNotifications] = React.useState(false);

    const title = PAGE_TITLES[location.pathname] || 'TaskMaster';
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    // Close notifications when clicking outside (simple approach: close on main content click)
    const handleMainClick = () => {
        if (showNotifications) setShowNotifications(false);
    };

    return (
        <div className="flex h-screen bg-[#060d11] overflow-hidden relative noise-overlay grid-bg ambient-glow">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 relative z-10">
                {/* Topbar */}
                <header className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.08] bg-white/[0.01] backdrop-blur-md shadow-lg sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <button
                            className="md:hidden p-2 -ml-2 rounded-xl text-slate-400 hover:text-[#26f7b2] hover:bg-white/[0.04] transition-colors"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                        >
                            <Menu size={20} />
                        </button>
                        <div key={location.pathname} className="page-title-fade">
                            <h1 className="text-[#f8fafc] text-lg sm:text-xl font-bold tracking-tight font-display">{title}</h1>
                            <p className="text-slate-500 text-xs hidden sm:block font-medium">{today}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative hidden xs:block sm:block">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="bg-white/[0.03] border border-white/[0.08] text-[#f8fafc] text-sm rounded-xl pl-9 pr-4 py-2 w-24 sm:w-48 focus:outline-none focus:border-[#26f7b2] focus:ring-4 focus:ring-[#26f7b2]/5 focus:w-32 sm:focus:w-64 transition-all duration-300 placeholder:text-slate-600"
                            />
                        </div>

                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowNotifications(!showNotifications);
                                    if (!permissionGranted) requestPermission();
                                }}
                                className={`p-2 rounded-xl border transition-all duration-200 relative flex ${showNotifications ? 'bg-[#26f7b2] text-black border-[#26f7b2] shadow-[0_0_15px_rgba(38,247,178,0.4)]' : 'bg-white/[0.03] text-slate-400 border-white/[0.08] hover:text-[#26f7b2] hover:bg-white/[0.08] hover:border-[#26f7b2]/30 hover:shadow-[0_0_12px_rgba(38,247,178,0.15)]'}`}
                            >
                                <Bell size={18} />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#26f7b2] text-[9px] font-black text-black shadow-sm ring-2 ring-[#060d11] border-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {/* Notifications Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-card-strong rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right">
                                    <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.01]">
                                        <h3 className="text-white font-bold flex items-center gap-2 font-display">
                                            Notifications
                                            {unreadCount > 0 && <span className="bg-[#26f7b2]/10 text-[#26f7b2] text-[10px] px-2.5 py-0.5 rounded-full font-extrabold">{unreadCount} new</span>}
                                        </h3>
                                        <button
                                            onClick={() => markAllAsRead()}
                                            disabled={unreadCount === 0}
                                            className="text-xs text-[#26f7b2] hover:text-[#26f7b2]/80 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors flex items-center gap-1"
                                        >
                                            <CheckCircle2 size={12} /> Mark all read
                                        </button>
                                    </div>
                                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-slate-500 flex flex-col items-center gap-2">
                                                <Bell size={24} className="opacity-20 mb-1 text-[#26f7b2]" />
                                                <p className="text-sm font-semibold">You're all caught up!</p>
                                                <p className="text-xs opacity-70">No new notifications right now.</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-white/[0.06]">
                                                {notifications.map(n => (
                                                    <div
                                                        key={n.id}
                                                        className={`p-4 transition-colors hover:bg-white/[0.04] cursor-pointer ${!n.read ? 'bg-[#26f7b2]/5' : ''}`}
                                                        onClick={() => !n.read && markAsRead(n.id)}
                                                    >
                                                        <div className="flex gap-3">
                                                            <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${!n.read ? 'bg-[#26f7b2] shadow-[0_0_8px_rgba(38,247,178,0.8)]' : 'bg-transparent'}`} />
                                                            <div className="min-w-0 flex-1">
                                                                <p className={`text-sm mb-0.5 pr-2 ${!n.read ? 'text-[#f8fafc] font-bold' : 'text-slate-300 font-medium'}`}>{n.title}</p>
                                                                <p className="text-slate-400 text-xs leading-relaxed mb-2">{n.body}</p>
                                                                <p className="text-slate-500 text-[10px] font-semibold flex items-center gap-1.5 uppercase tracking-widest"><Clock size={10} /> {formatDistanceToNow(n.created_at, { addSuffix: true })}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content — keyed on location.key so each route change re-mounts the animation */}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 pb-20 sm:pb-6 relative safe-area-bottom" onClick={handleMainClick}>
                    <div className="page-enter h-full">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
