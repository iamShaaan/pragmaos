import React, { useMemo, useState } from 'react';
import { useAppStore } from '../store';
import { Clock, Calendar as CalendarIcon, Search } from 'lucide-react';
import { formatDuration } from '../utils/timeFormat';
import { format } from 'date-fns';

export const TimeTracker: React.FC = () => {
    const { tasks } = useAppStore();
    const [searchQuery, setSearchQuery] = useState('');

    // Aggregate time logs by day
    const timeEntries = useMemo(() => {
        const entriesMap: Record<string, { date: Date; totalMs: number; tasks: Record<string, { title: string; ms: number }> }> = {};

        tasks.forEach(task => {
            if (!task.time_logs) return;

            task.time_logs.forEach(log => {
                const dateKey = format(new Date(log.start), 'yyyy-MM-dd');

                if (!entriesMap[dateKey]) {
                    entriesMap[dateKey] = {
                        date: new Date(log.start),
                        totalMs: 0,
                        tasks: {}
                    };
                }

                entriesMap[dateKey].totalMs += log.duration_ms;

                if (!entriesMap[dateKey].tasks[task.id]) {
                    entriesMap[dateKey].tasks[task.id] = { title: task.title, ms: 0 };
                }
                entriesMap[dateKey].tasks[task.id].ms += log.duration_ms;
            });
        });

        // Convert map to array and sort by date descending (newest first)
        return Object.values(entriesMap)
            .sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [tasks]);

    const filteredEntries = useMemo(() => {
        if (!searchQuery.trim()) return timeEntries;
        const q = searchQuery.toLowerCase();

        return timeEntries.filter(day => {
            // Check if date string matches
            if (format(day.date, 'MMMM d, yyyy').toLowerCase().includes(q)) return true;
            // Check if any task title matches
            return Object.values(day.tasks).some(t => t.title.toLowerCase().includes(q));
        });
    }, [timeEntries, searchQuery]);

    return (
        <div className="bg-bg-card border border-border-card rounded-[28px] p-8 sm:p-10 space-y-8 min-h-[500px] shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-text-main text-xl font-black flex items-center gap-3">
                        <div className="p-2.5 bg-[#DDFBF0] dark:bg-[#21D89A]/10 rounded-xl border border-[#B7F3DD] dark:border-[#21D89A]/20 shadow-sm"><Clock size={20} className="text-[#047857] dark:text-[#21D89A]" /></div>
                        Time Tracker
                    </h2>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest mt-2">
                        Daily breakdown of your tracked time
                    </p>
                </div>

                {/* Search */}
                <div className="relative w-full md:w-64">
                    <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        type="text"
                        placeholder="Search date or task..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] rounded-[14px] pl-10 pr-4 py-2.5 text-sm text-text-main focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                    />
                </div>
            </div>

            {timeEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-border-card dark:border-[#22372D] rounded-[22px] bg-[#F3F7F5]/30">
                    <Clock size={32} className="mb-2 text-text-muted/40" />
                    <p className="text-xs font-bold text-text-main">No time tracked yet.</p>
                    <p className="text-[10px] text-text-muted mt-1">Start a timer on a task to see your daily reports here.</p>
                </div>
            ) : filteredEntries.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-text-muted text-sm font-bold">No time entries match your search.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {filteredEntries.map((dayEntry) => (
                        <div key={dayEntry.date.toISOString()} className="bg-bg-card border border-border-card rounded-[22px] overflow-hidden group shadow-sm">
                            {/* Day Header */}
                            <div className="flex items-center justify-between p-5 bg-[#F8FAF9]/50 dark:bg-[#111D17]/10 border-b border-border-card dark:border-[#22372D] transition-colors">
                                <div className="flex items-center gap-3 pr-4">
                                    <div className="p-2 bg-[#DDFBF0] dark:bg-[#21D89A]/10 border border-[#B7F3DD] dark:border-[#21D89A]/20 rounded-lg shrink-0">
                                        <CalendarIcon size={16} className="text-[#047857] dark:text-[#21D89A]" />
                                    </div>
                                    <div>
                                        <p className="text-text-main font-bold text-sm tracking-wide">
                                            {format(dayEntry.date, 'EEEE, MMMM do, yyyy')}
                                        </p>
                                        <p className="text-text-muted text-[10px] uppercase font-black tracking-widest mt-0.5">
                                            {Object.keys(dayEntry.tasks).length} tasks worked on
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 pl-4 border-l border-border-card dark:border-[#22372D]">
                                    <p className="text-[#047857] dark:text-[#21D89A] font-black text-xl tracking-tight">
                                        {formatDuration(dayEntry.totalMs)}
                                    </p>
                                    <p className="text-text-muted text-[9px] uppercase font-black tracking-widest mt-0.5">Total</p>
                                </div>
                            </div>

                            {/* Task Breakdown */}
                            <div className="p-4 bg-bg-card">
                                <div className="space-y-1">
                                    {Object.values(dayEntry.tasks).sort((a, b) => b.ms - a.ms).map((task, i) => (
                                        <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-xl hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] transition-colors">
                                            <div className="flex items-center gap-2.5 min-w-0 pr-4">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#047857] dark:bg-[#21D89A] shrink-0" />
                                                <p className="text-text-main text-xs font-semibold truncate">{task.title}</p>
                                            </div>
                                            <p className="text-[#047857] dark:text-[#21D89A] text-xs font-bold font-mono tracking-widest shrink-0">
                                                {formatDuration(task.ms)}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
