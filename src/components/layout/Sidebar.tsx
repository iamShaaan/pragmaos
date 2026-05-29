import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import logoImg from '../../assets/LOGO.png';
import faviconImg from '../../assets/Favicon.png';
import {
    LayoutDashboard,
    CheckSquare,
    Calendar,
    Users,
    FolderKanban,
    ChevronLeft,
    ChevronRight,
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
                    className="fixed inset-0 bg-black/20 z-40 md:hidden backdrop-blur-sm transition-opacity"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
            <aside
                className={`
                    fixed md:relative z-50
                    ${sidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0 md:w-18'} 
                    transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] 
                    bg-bg-sidebar border-r border-border-card flex flex-col h-screen top-0 left-0
                `}
            >
                {/* Logo - Calmer and cleaner */}
                <div className="flex items-center px-4 border-b border-border-card mb-4 h-[72px]">
                    {!sidebarOpen ? (
                        <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 transition-transform duration-200 hover:scale-105 shadow-sm mx-auto">
                            <img src={faviconImg} alt="PragmaOS" className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="flex items-center transition-all duration-200 hover:opacity-90 pl-1.5">
                            <img src={logoImg} alt="PragmaOS" className="h-[42px] w-auto object-contain" />
                        </div>
                    )}
                </div>

                {/* Nav Items */}
                <nav className="flex-1 space-y-1.5 px-3">
                    {sidebarOpen && (
                        <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">Menu</p>
                    )}
                    {navItems.map(({ to, icon: Icon, label, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            title={label}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative border ${isActive
                                    ? 'bg-[#DDFBF0] text-[#047857] border-[#B7F3DD]'
                                    : 'text-[#6B7C73] border-transparent hover:text-text-main hover:bg-bg-card hover:border-border-card'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {/* Active left accent bar */}
                                    <span
                                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-0.5 rounded-r-full transition-all duration-300 ${isActive
                                            ? 'h-5 bg-[#047857]'
                                            : 'h-0 bg-transparent'
                                            }`}
                                    />
                                    <Icon
                                        size={19}
                                        className={`flex-shrink-0 transition-all duration-200 ${isActive
                                            ? 'text-[#047857]'
                                            : 'group-hover:scale-110 group-hover:text-text-main'
                                            }`}
                                    />
                                    {sidebarOpen && (
                                        <span className={`text-sm tracking-wide truncate ${isActive ? 'font-bold' : 'font-semibold'}`}>{label}</span>
                                    )}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Active Timer Banner */}
                {activeTimerId && activeTask && sidebarOpen && (
                    <div className="mx-3 mb-4 p-4 rounded-xl bg-[#DDFBF0] border border-[#B7F3DD] shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#047857] animate-pulse" />
                            <span className="text-[#047857] text-[10px] font-bold uppercase tracking-widest">Live Timer</span>
                        </div>
                        <p className="text-text-main text-xs font-semibold truncate">{activeTask.title}</p>
                    </div>
                )}

                {/* User Profile & Logout */}
                <div className="mt-auto border-t border-border-card p-4 space-y-4">
                    {user && (
                        <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 border border-border-card bg-bg-card flex items-center justify-center text-[#047857] font-extrabold text-sm font-display shadow-sm">
                                {photoURL ? (
                                    <img
                                        src={photoURL}
                                        alt="avatar"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    resolvedName.charAt(0).toUpperCase()
                                )}
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-text-main text-sm font-bold truncate">{resolvedName}</p>
                                    <p className="text-text-muted text-[10px] truncate">{user.email}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex-1 p-2.5 rounded-xl bg-bg-input border border-border-input text-text-muted hover:text-text-main hover:bg-bg-card hover:border-border-card transition-all duration-200 flex items-center justify-center cursor-pointer"
                        >
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {sidebarOpen && (
                            <button
                                onClick={logout}
                                className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-450 hover:bg-rose-500 hover:text-white hover:border-rose-500 transition-all duration-200 cursor-pointer"
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
