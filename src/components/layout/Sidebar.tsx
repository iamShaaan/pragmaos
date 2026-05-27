import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {
    LayoutDashboard,
    CheckSquare,
    Calendar,
    Users,
    FolderKanban,
    ChevronLeft,
    ChevronRight,
    Sparkles,
    LogOut,
    ListTodo,
    Wallet
} from 'lucide-react';
import { useAppStore } from '../../store';
import { db, APP_ID } from '../../firebase/config';
import { doc, onSnapshot } from 'firebase/firestore';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
    { to: '/meetings', icon: Calendar, label: 'Meetings' },
    { to: '/projects', icon: FolderKanban, label: 'Projects' },
    { to: '/routine', icon: ListTodo, label: 'Checklist' },
    { to: '/finance', icon: Wallet, label: 'Finance' },
    { to: '/user-data', icon: Users, label: 'User Data' },
];

export const Sidebar: React.FC = () => {
    const { sidebarOpen, setSidebarOpen, activeTimerId, tasks } = useAppStore();
    const { user, logout } = useAuth();
    const activeTask = tasks.find((t) => t.id === activeTimerId);
    const [photoURL, setPhotoURL] = useState<string | null>(null);
    const [displayName, setDisplayName] = useState<string | null>(null);
    const location = useLocation();

    // Close sidebar on mobile when route changes
    useEffect(() => {
        if (window.innerWidth < 768 && sidebarOpen) {
            setSidebarOpen(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    // Live-listen to the user's profile photo from Firestore
    useEffect(() => {
        if (!user?.uid) return;
        const unsub = onSnapshot(doc(db, `apps/${APP_ID}/users`, user.uid), (snap) => {
            const data = snap.data();
            setPhotoURL(data?.photoURL || null);
            setDisplayName(data?.displayName || null);
        });
        return unsub;
    }, [user?.uid]);

    const resolvedName = displayName || user?.displayName || user?.email?.split('@')[0] || 'User';

    return (
        <>
            {/* Mobile Backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-[#060d11]/80 z-40 md:hidden backdrop-blur-md transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <aside
                className={`
                    fixed md:relative z-50
                    ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-18'} 
                    transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] 
                    bg-white/[0.01] border-r border-white/[0.08] backdrop-blur-xl flex flex-col h-screen top-0 left-0
                `}
            >
                {/* Logo */}
                <div className="flex items-center gap-3 px-4 py-6 border-b border-white/[0.08] mb-4">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#26f7b2] to-[#009d9a] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#26f7b2]/20 transition-transform duration-200 hover:scale-105">
                        <Sparkles size={18} className="text-black" />
                    </div>
                    {sidebarOpen && (
                        <div className="flex flex-col leading-none transition-opacity duration-200">
                            <span className="text-[#f8fafc] font-extrabold text-lg tracking-tight font-display">TaskMaster</span>
                            <span className="text-[#26f7b2]/70 text-[9px] font-bold uppercase tracking-[0.2em] mt-1">Project Ecosystem</span>
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 space-y-1.5 px-3">
                    {sidebarOpen && (
                        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Menu</p>
                    )}
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            title={label}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative overflow-hidden ${isActive
                                    ? 'bg-[#26f7b2]/10 text-[#26f7b2] border border-[#26f7b2]/20 shadow-[0_0_20px_rgba(38,247,178,0.12)]'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] hover:shadow-[0_0_10px_rgba(38,247,178,0.06)] border border-transparent'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active left accent bar */}
                                    <span
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full transition-all duration-300 ${isActive
                                            ? 'h-5 bg-[#26f7b2] shadow-[0_0_8px_rgba(38,247,178,0.8)]'
                                            : 'h-0 bg-transparent'
                                            }`}
                                    />
                                    <Icon
                                        size={19}
                                        className={`flex-shrink-0 transition-all duration-200 ${isActive
                                            ? 'text-[#26f7b2]'
                                            : 'group-hover:scale-110 group-hover:text-slate-100'
                                            }`}
                                    />
                                    {sidebarOpen && (
                                        <span className="text-sm font-semibold tracking-wide truncate">{label}</span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Active Timer Banner */}
                {activeTimerId && activeTask && sidebarOpen && (
                    <div className="mx-3 mb-4 p-4 rounded-xl bg-[#26f7b2]/5 border border-[#26f7b2]/20 backdrop-blur-sm shadow-[0_0_15px_rgba(38,247,178,0.05)]">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#26f7b2] animate-pulse glow-emerald" />
                            <span className="text-[#26f7b2] text-[10px] font-black uppercase tracking-widest">Live Timer</span>
                        </div>
                        <p className="text-slate-200 text-xs font-semibold truncate">{activeTask.title}</p>
                    </div>
                )}

                {/* User Profile & Logout */}
                <div className="mt-auto border-t border-white/[0.08] p-4 space-y-4">
                    {user && (
                        <div className="flex items-center gap-3">
                            {/* Avatar: profile photo or initial */}
                            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-white/[0.1] shadow-inner transition-all duration-200 hover:border-[#26f7b2]/40 hover:shadow-[0_0_10px_rgba(38,247,178,0.15)]">
                                {photoURL ? (
                                    <img
                                        src={photoURL}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-white/[0.03] flex items-center justify-center text-[#26f7b2] font-extrabold text-sm font-display">
                                        {resolvedName.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-slate-200 text-sm font-bold truncate">{resolvedName}</p>
                                    <p className="text-slate-500 text-[10px] truncate">{user.email}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex-1 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.08] text-slate-400 hover:text-slate-100 hover:bg-white/[0.06] hover:border-white/[0.15] transition-all duration-200 flex items-center justify-center cursor-pointer"
                        >
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {sidebarOpen && (
                            <button
                                onClick={logout}
                                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white hover:border-rose-500 hover:shadow-[0_0_15px_rgba(244,63,94,0.3)] transition-all duration-200 cursor-pointer"
                                title="Logout"
                            >
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>
        </>
    );
};
