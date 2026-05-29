import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    CheckSquare, Calendar, Users, FolderKanban, Timer,
    TrendingUp, Clock, ArrowRight, Flame, CircleCheck, AlertCircle, Loader2, UserPlus, Square
} from 'lucide-react';
import { auth } from '../firebase/config';
import { useTimer } from '../hooks/useTimer';
import { useAppStore } from '../store';
import { formatDuration, formatDateTime } from '../utils/timeFormat';
import { statusBadge, priorityBadge } from '../components/ui/Badge';
import { Link } from 'react-router-dom';
import { Modal } from '../components/ui/Modal';
import { ClientForm } from '../components/clients/ClientForm';
import { format, addMonths, setDate as setDateFns, isPast, isToday, differenceInDays } from 'date-fns';
import { updateDocById } from '../firebase/firestore';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({
    icon: Icon, label, value, sub, color, to, loading, actionIcon: ActionIcon, onAction
}: {
    icon: React.ElementType; label: string; value: number | string; sub?: string;
    color: string; to: string; loading?: boolean; actionIcon?: React.ElementType; onAction?: (e: React.MouseEvent) => void;
}) => (
    <div className="relative h-full flex flex-col">
        <Link to={to} className="flex-1 block h-full">
            <motion.div
                whileHover={{ scale: 1.01, y: -2 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="bg-white dark:bg-bg-card border border-border-card rounded-[20px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.06)] cursor-pointer group flex flex-col h-full justify-between hover:border-glitch-emerald/50 transition-all"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className={`p-2.5 rounded-full ${color} flex items-center justify-center`}><Icon size={18} /></div>
                    <ArrowRight size={14} className="text-text-muted group-hover:text-[#047857] dark:group-hover:text-glitch-emerald transition-colors" />
                </div>
                {loading ? (
                    <Loader2 size={20} className="animate-spin text-text-muted mb-1" />
                ) : (
                    <p className="text-[36px] font-extrabold text-text-main tracking-tight font-display mb-1">{value}</p>
                )}
                <div className="flex items-center justify-between">
                    <p className="text-text-muted text-sm font-semibold">{label}</p>
                    {sub && <p className="text-text-muted/75 text-xs font-semibold">{sub}</p>}
                </div>
            </motion.div>
        </Link>
        {ActionIcon && onAction && (
            <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAction(e); }}
                className="absolute top-5 right-12 p-2 rounded-xl bg-bg-input border border-border-input hover:bg-bg-card text-text-muted hover:text-[#047857] dark:hover:text-glitch-emerald hover:border-glitch-emerald/30 transition-all z-10 cursor-pointer"
                title={`Quick add ${label.toLowerCase()}`}
            >
                <ActionIcon size={16} />
            </button>
        )}
    </div>
);

// ─── Active Timer Board ───────────────────────────────────────────────────────
const ActiveTimerBoard = ({ task }: { task: import('../types').Task }) => {
    const { elapsed, stop } = useTimer(task);

    return (
        <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-[#21D89A] to-[#047857] border border-[#21D89A]/10 rounded-3xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[#053B2A] font-semibold"
        >
            <div className="flex items-center gap-4">
                <div className="p-3 bg-black/10 rounded-xl relative overflow-hidden flex-shrink-0">
                    <div className="absolute inset-0 bg-black/5 animate-ping rounded-xl"></div>
                    <Timer size={24} className="text-[#053B2A] relative z-10" />
                </div>
                <div>
                    <h3 className="text-[#053B2A] font-extrabold text-lg leading-tight font-display">{task.title}</h3>
                    <p className="text-[#053B2A]/85 text-xs flex items-center gap-2 mt-0.5 font-bold uppercase tracking-wider">
                        {task.project_id && <span className="bg-black/10 px-2 py-0.5 rounded-md text-[9px] font-black tracking-widest text-[#053B2A]">Project Task</span>}
                        <span className="flex items-center gap-1"><Flame size={12} className="fill-current text-[#053B2A]" /> Actively Tracking</span>
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-4 sm:gap-6 mt-2 sm:mt-0 w-full sm:w-auto justify-between sm:justify-end">
                <div className="text-right">
                    <p className="text-3xl font-black text-[#053B2A] tabular-nums tracking-tight font-display">
                        {formatDuration(elapsed)}
                    </p>
                </div>
                <button
                    onClick={stop}
                    className="flex items-center justify-center p-3 rounded-xl bg-black/10 hover:bg-black/20 text-[#053B2A] border border-black/5 transition-all group shadow-sm flex-shrink-0 cursor-pointer"
                    title="Stop Timer"
                >
                    <Square size={20} className="fill-current text-[#053B2A]" />
                </button>
            </div>
        </motion.div>
    );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export const Dashboard: React.FC = () => {
    const { tasks, meetings, clients, projects, emis } = useAppStore();
    const [showClientForm, setShowClientForm] = React.useState(false);

    const isLoading = tasks.length === 0 && meetings.length === 0 && clients.length === 0 && projects.length === 0;
    const now = useMemo(() => new Date(), []);

    const activeTask = useMemo(
        () => tasks.find(t => t.active_timer && t.active_timer.user_id === auth.currentUser?.uid),
        [tasks]
    );

    const openTasks = useMemo(
        () => tasks.filter(t => t.status === 'open' || t.status === 'in_progress'),
        [tasks]
    );
    const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done'), [tasks]);
    const overdueTasks = useMemo(
        () => tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== 'done'),
        [tasks, now]
    );
    const highPriorityOpen = useMemo(
        () => tasks.filter(t => t.priority === 'high' && t.status !== 'done'),
        [tasks]
    );

    const upcomingMeetings = useMemo(
        () => meetings.filter(m => m.start_time > now).sort((a, b) => +a.start_time - +b.start_time).slice(0, 5),
        [meetings, now]
    );

    const recentTasks = useMemo(() => tasks.slice(0, 6), [tasks]);

    const totalTrackedTodayMs = useMemo(() => {
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        let total = 0;
        tasks.forEach(task => {
            if (task.time_logs) {
                task.time_logs.forEach(log => {
                    const logStart = new Date(log.start).getTime();
                    if (logStart >= startOfToday) {
                        total += log.duration_ms;
                    }
                });
            }
        });
        return total;
    }, [tasks, now]);

    const activeProjects = useMemo(() => projects.filter(p => p.status === 'active'), [projects]);

    const completionRate = useMemo(() => {
        if (tasks.length === 0) return 0;
        return Math.round((doneTasks.length / tasks.length) * 100);
    }, [tasks.length, doneTasks.length]);

    const dueSubscriptions = useMemo(() => {
        const threshold = new Date(now);
        threshold.setDate(threshold.getDate() + 5);
        threshold.setHours(23, 59, 59, 999);

        return emis.filter(e => {
            const dateStr = e.next_billing_date 
                ? e.next_billing_date 
                : (e.due_day ? format(setDateFns(addMonths(new Date(), e.due_day >= now.getDate() ? 0 : 1), e.due_day), 'yyyy-MM-dd') : null);
            if (!dateStr) return false;
            
            const nextDate = new Date(dateStr);
            return nextDate <= threshold;
        }).map(e => {
            const dateStr = e.next_billing_date 
                ? e.next_billing_date 
                : (e.due_day ? format(setDateFns(addMonths(new Date(), e.due_day >= now.getDate() ? 0 : 1), e.due_day), 'yyyy-MM-dd') : '');
            return { ...e, computedNextDate: new Date(dateStr) };
        }).sort((a, b) => a.computedNextDate.getTime() - b.computedNextDate.getTime());
    }, [emis, now]);

    const handleMarkSubscriptionPaid = async (sub: any) => {
        try {
            const nextDate = new Date(sub.computedNextDate);
            let addedMonths = 1;
            if (sub.billing_cycle === '3_months') addedMonths = 3;
            else if (sub.billing_cycle === '1_year') addedMonths = 12;
            
            const newNextDate = addMonths(nextDate, addedMonths);
            
            await updateDocById('emis', sub.id, {
                next_billing_date: format(newNextDate, 'yyyy-MM-dd')
            });
        } catch (error) {
            console.error(error);
        }
    };

    const firstName = (auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'there').split(' ')[0];
    const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';

    return (
        <div className="space-y-6">
            {/* ── Greeting header ── */}
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main tracking-tight font-display">
                    {greeting}, <span className="text-gradient-glitch">{firstName}</span>
                </h1>
                <p className="text-text-muted text-sm font-medium">Here's your productivity snapshot for today.</p>
            </div>

            {/* ── Active Task Timer Board ── */}
            {activeTask && <ActiveTimerBoard task={activeTask} />}

            {/* ── Subscriptions Due Notification ── */}
            {dueSubscriptions.length > 0 && (
                <div className="space-y-3">
                    {dueSubscriptions.map(sub => {
                        const isLate = isPast(sub.computedNextDate) && !isToday(sub.computedNextDate);
                        const daysLeft = Math.max(0, differenceInDays(sub.computedNextDate, now));
                        
                        return (
                        <motion.div
                            key={sub.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex items-center gap-3 p-4 border rounded-2xl ${isLate ? 'bg-[#FFE4E8] border-transparent text-[#BE123C]' : 'bg-[#FEF3C7] border-transparent text-[#92400E]'}`}
                        >
                            <AlertCircle size={18} className="flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold">
                                    Subscription Due: {sub.title}
                                </p>
                                <p className="text-xs truncate opacity-80">
                                    {isLate ? 'Overdue!' : daysLeft === 0 ? 'Due Today' : `Due in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`} • {format(sub.computedNextDate, 'dd MMM yyyy')}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleMarkSubscriptionPaid(sub)}
                                className={`text-xs font-bold flex-shrink-0 flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg cursor-pointer ${isLate ? 'bg-[#BE123C]/10 hover:bg-[#BE123C]/20 text-[#BE123C]' : 'bg-[#92400E]/10 hover:bg-[#92400E]/20 text-[#92400E]'}`}
                                title="Mark as Paid"
                            >
                                <CheckSquare size={14} /> Paid
                            </button>
                        </motion.div>
                    )})}
                </div>
            )}

            {/* ── Stat Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={CheckSquare} label="Open Tasks" to="/tasks"
                    value={openTasks.length}
                    sub={overdueTasks.length > 0 ? `${overdueTasks.length} overdue` : 'all on track'}
                    color="bg-[#DDFBF0] dark:bg-glitch-emerald/10 text-[#047857] dark:text-glitch-emerald"
                    loading={isLoading}
                />
                <StatCard
                    icon={Calendar} label="Upcoming Meetings" to="/meetings"
                    value={upcomingMeetings.length}
                    sub="next 30 days"
                    color="bg-[#E0F2FE] dark:bg-indigo-500/10 text-[#0369A1] dark:text-[#E0F2FE]"
                    loading={isLoading}
                />
                <StatCard
                    icon={Users} label="Clients" to="/user-data"
                    value={clients.length}
                    color="bg-[#DDFBF0] dark:bg-glitch-emerald/10 text-[#047857] dark:text-glitch-emerald"
                    loading={isLoading}
                    actionIcon={UserPlus}
                    onAction={() => setShowClientForm(true)}
                />
                <StatCard
                    icon={FolderKanban} label="Active Projects" to="/projects"
                    value={activeProjects.length}
                    sub={`${projects.length} total`}
                    color="bg-[#FEF3C7] dark:bg-amber-500/10 text-[#92400E] dark:text-[#FEF3C7]"
                    loading={isLoading}
                />
            </div>

            {/* ── Progress + Priority Bars ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Time tracked */}
                <div className="bg-white dark:bg-bg-card border border-border-card rounded-[18px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.04)]">
                    <div className="flex items-center gap-2 mb-1">
                        <Timer size={15} className="text-[#047857] dark:text-glitch-emerald" />
                        <span className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider">Time Tracked Today</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-[#047857] dark:text-glitch-emerald mt-2 tracking-tight font-display">{formatDuration(totalTrackedTodayMs)}</p>
                    <p className="text-text-muted text-xs mt-1 font-semibold">across all tasks today</p>
                </div>

                {/* Completion rate */}
                <div className="bg-white dark:bg-bg-card border border-border-card rounded-[18px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.04)]">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp size={15} className="text-[#047857] dark:text-glitch-emerald" />
                        <span className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider">Completion Rate</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-[#047857] dark:text-glitch-emerald mt-2 tracking-tight font-display">{completionRate}%</p>
                    <div className="mt-2.5 h-1.5 bg-[#E7EEE9] dark:bg-bg-input rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-[#21D89A] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${completionRate}%` }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                {/* High priority alerts */}
                <div className="bg-white dark:bg-bg-card border border-border-card rounded-[18px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.04)]">
                    <div className="flex items-center gap-2 mb-1">
                        <Flame size={15} className={highPriorityOpen.length > 0 ? 'text-[#EF476F]' : 'text-text-muted'} />
                        <span className="text-text-muted text-[10px] sm:text-xs font-bold uppercase tracking-wider">High Priority</span>
                    </div>
                    <p className={`text-xl sm:text-2xl font-black mt-2 tracking-tight font-display ${highPriorityOpen.length > 0 ? 'text-[#EF476F] animate-pulse' : 'text-text-muted'}`}>
                        {highPriorityOpen.length}
                    </p>
                    <p className="text-text-muted text-xs mt-1 font-semibold">
                        {highPriorityOpen.length > 0 ? 'needs attention' : 'all clear'}
                    </p>
                </div>
            </div>

            {/* ── Main Content Grid ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Tasks */}
                <div className="bg-white dark:bg-bg-card border border-border-card rounded-[22px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.05)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-text-main font-extrabold font-display">Recent Tasks</h2>
                        <Link to="/tasks" className="text-[#047857] dark:text-glitch-emerald text-xs hover:opacity-80 transition-colors flex items-center gap-1 font-bold">
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-10 bg-bg-input border border-border-card animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : recentTasks.length === 0 ? (
                        <div className="text-center py-10">
                            <CircleCheck size={32} className="text-text-muted opacity-30 mx-auto mb-2" />
                            <p className="text-text-muted text-sm font-semibold">No tasks yet</p>
                            <Link to="/tasks" className="text-[#047857] dark:text-glitch-emerald text-xs hover:underline mt-1.5 inline-block font-semibold">
                                Create your first task →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {recentTasks.map((task) => (
                                <Link to="/tasks" key={task.id}>
                                    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-bg-input transition-all group">
                                        <div className="min-w-0 flex-1 flex items-center gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${task.status === 'done' ? 'bg-[#21D89A]' :
                                                task.status === 'in_progress' ? 'bg-[#0369A1]' :
                                                    task.priority === 'high' ? 'bg-[#EF476F]' : 'bg-text-muted'
                                                }`} />
                                            <div className="min-w-0">
                                                <p className={`text-sm truncate font-semibold ${task.status === 'done' ? 'text-text-muted line-through' : 'text-text-main'}`}>
                                                    {task.title}
                                                </p>
                                                {task.due_date && (
                                                    <p className={`text-xs truncate font-medium mt-0.5 ${new Date(task.due_date) < now && task.status !== 'done' ? 'text-[#EF476F]' : 'text-text-muted'}`}>
                                                        {formatDateTime(task.due_date)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="ml-3 flex items-center gap-2 flex-shrink-0">
                                            {priorityBadge(task.priority)}
                                            {statusBadge(task.status)}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Upcoming Meetings */}
                <div className="bg-white dark:bg-bg-card border border-border-card rounded-[22px] p-5 shadow-[0_8px_24px_rgba(16,35,27,0.05)]">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-text-main font-extrabold font-display">Upcoming Meetings</h2>
                        <Link to="/meetings" className="text-[#047857] dark:text-glitch-emerald text-xs hover:opacity-80 transition-colors flex items-center gap-1 font-bold">
                            View all <ArrowRight size={12} />
                        </Link>
                    </div>

                    {isLoading ? (
                        <div className="space-y-3">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="h-14 bg-bg-input border border-border-card animate-pulse rounded-xl" />
                            ))}
                        </div>
                    ) : upcomingMeetings.length === 0 ? (
                        <div className="text-center py-10">
                            <Calendar size={32} className="text-text-muted opacity-30 mx-auto mb-2" />
                            <p className="text-text-muted text-sm font-semibold">No upcoming meetings</p>
                            <Link to="/meetings" className="text-[#047857] dark:text-glitch-emerald text-xs hover:underline mt-1.5 inline-block font-semibold">
                                Schedule one →
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {upcomingMeetings.map((m) => {
                                const isTodayMeeting = new Date(m.start_time).toDateString() === now.toDateString();
                                return (
                                    <Link to="/meetings" key={m.id}>
                                        <div className="flex items-start gap-3 py-2.5 px-3 rounded-xl hover:bg-bg-input transition-all">
                                            <div className={`p-2 rounded-xl flex-shrink-0 ${isTodayMeeting ? 'bg-[#DDFBF0] border border-[#B7F3DD]' : 'bg-bg-input border border-border-card'}`}>
                                                <Clock size={13} className={isTodayMeeting ? 'text-[#047857]' : 'text-text-muted'} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="text-text-main text-sm font-bold truncate">{m.title}</p>
                                                    {isTodayMeeting && (
                                                        <span className="text-[9px] font-bold uppercase tracking-wider text-[#047857] bg-[#DDFBF0] border border-[#B7F3DD] px-1.5 py-0.5 rounded-full flex-shrink-0 shadow-sm">
                                                            TODAY
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-text-muted text-xs mt-0.5 font-medium">{formatDateTime(m.start_time)}</p>
                                                {m.participants?.length > 0 && (
                                                    <p className="text-text-muted/80 text-xs truncate mt-0.5 font-medium">
                                                        {m.participants.slice(0, 3).join(', ')}{m.participants.length > 3 ? ` +${m.participants.length - 3}` : ''}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Overdue Alert strip ── */}
            {overdueTasks.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-[#FFE4E8] border border-transparent rounded-2xl"
                >
                    <AlertCircle size={18} className="text-[#BE123C] flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <p className="text-[#BE123C] text-sm font-bold">
                            {overdueTasks.length} overdue task{overdueTasks.length > 1 ? 's' : ''}
                        </p>
                        <p className="text-[#BE123C]/80 text-xs truncate font-medium">
                            {overdueTasks.slice(0, 3).map(t => t.title).join(' · ')}
                            {overdueTasks.length > 3 ? ` and ${overdueTasks.length - 3} more` : ''}
                        </p>
                    </div>
                    <Link to="/tasks" className="text-[#BE123C] hover:opacity-80 text-xs font-bold flex-shrink-0 flex items-center gap-1 transition-colors">
                        Review <ArrowRight size={12} />
                    </Link>
                </motion.div>
            )}

            <Modal isOpen={showClientForm} onClose={() => setShowClientForm(false)} title="Add Client" size="lg">
                <ClientForm onClose={() => setShowClientForm(false)} />
            </Modal>
        </div>
    );
};
