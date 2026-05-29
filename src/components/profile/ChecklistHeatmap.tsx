import React, { useMemo, useState } from 'react';
import { format, eachDayOfInterval, isToday, isFuture, startOfWeek, endOfWeek } from 'date-fns';
import type { Routine, DailyLog } from '../../types';

interface ChecklistHeatmapProps {
    routines: Routine[];
    dailyLogs: DailyLog[];
}

type DotStatus = 'deepgreen' | 'lightgreen' | 'empty' | 'future' | 'outside';

export const ChecklistHeatmap: React.FC<ChecklistHeatmapProps> = ({ routines, dailyLogs }) => {
    const [hoveredDay, setHoveredDay] = useState<string | null>(null);
    const today = new Date();
    const year = today.getFullYear();

    const activeRoutines = useMemo(() => routines.filter(r => !r.is_archived), [routines]);

    // Jan 1 to Dec 31 of current year, padded to full weeks
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31);
    const gridStart = startOfWeek(yearStart, { weekStartsOn: 0 });
    const gridEnd = endOfWeek(yearEnd, { weekStartsOn: 0 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

    // Build data map
    const dayData = useMemo(() => {
        const map: Record<string, { completed: number; total: number; rate: number; status: DotStatus }> = {};

        allDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');

            // Outside the year
            if (day < yearStart || day > yearEnd) {
                map[dateStr] = { completed: 0, total: 0, rate: 0, status: 'outside' };
                return;
            }

            if (isFuture(day) && !isToday(day)) {
                map[dateStr] = { completed: 0, total: 0, rate: 0, status: 'future' };
                return;
            }

            const total = activeRoutines.length;
            if (total === 0) {
                map[dateStr] = { completed: 0, total: 0, rate: 0, status: 'empty' };
                return;
            }

            const logsForDay = dailyLogs.filter(l => l.date === dateStr && l.completed);
            const completedIds = new Set(logsForDay.map(l => l.routine_id));
            const completed = activeRoutines.filter(r => completedIds.has(r.id)).length;
            const rate = Math.round((completed / total) * 100);

            let status: DotStatus = 'empty';
            if (rate >= 100) status = 'deepgreen';
            else if (rate >= 50) status = 'lightgreen';

            map[dateStr] = { completed, total, rate, status };
        });
        return map;
    }, [allDays, activeRoutines, dailyLogs]);

    // Arrange into weeks
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < allDays.length; i += 7) {
        weeks.push(allDays.slice(i, i + 7));
    }
    const totalWeeks = weeks.length;

    // Month labels
    const monthLabels = useMemo(() => {
        const labels: { index: number; label: string }[] = [];
        let lastMonth = -1;
        weeks.forEach((week, wi) => {
            for (const day of week) {
                if (!day) continue;
                const m = day.getMonth();
                if (m !== lastMonth && day >= yearStart && day <= yearEnd) {
                    labels.push({ index: wi, label: format(day, 'MMM') });
                    lastMonth = m;
                    break;
                }
            }
        });
        return labels;
    }, [weeks]);

    const getDotStyle = (status: DotStatus): string => {
        switch (status) {
            case 'deepgreen':  return 'bg-[#21D89A] dark:bg-[#21D89A]';
            case 'lightgreen': return 'bg-[#DDFBF0] dark:bg-[#21D89A]/20 border border-[#B7F3DD] dark:border-transparent';
            case 'empty':      return 'bg-[#F3F7F5] dark:bg-[#1A2B23]/40 border border-[#DDE8E2] dark:border-[#22372D]/30';
            case 'future':     return 'bg-[#F7FAF8]/50 dark:bg-[#0D1612]/20 border border-[#DDE8E2]/30 dark:border-[#22372D]/10';
            case 'outside':    return 'bg-transparent';
            default:           return 'bg-[#F3F7F5] dark:bg-[#1A2B23]/40 border border-[#DDE8E2]';
        }
    };

    const getTooltipColor = (status: DotStatus): string => {
        switch (status) {
            case 'deepgreen':  return 'text-[#047857] dark:text-[#21D89A] font-bold';
            case 'lightgreen': return 'text-[#21D89A] dark:text-emerald-300 font-semibold';
            default:           return 'text-text-muted';
        }
    };

    return (
        <div className="bg-bg-card border border-border-card rounded-[22px] px-6 py-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                    <span className="text-text-main text-xs font-bold tracking-wide uppercase">All-Around Productivity</span>
                    <span className="text-text-muted/30 text-[10px]">•</span>
                    <span className="text-text-muted text-xs font-medium">{year}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-text-muted text-[10px] font-medium">Less</span>
                    <div className="w-[10px] h-[10px] rounded-[3px] bg-[#F3F7F5] dark:bg-[#1A2B23]/40 border border-[#DDE8E2] dark:border-[#22372D]/30" />
                    <div className="w-[10px] h-[10px] rounded-[3px] bg-[#DDFBF0] dark:bg-[#21D89A]/20 border border-[#B7F3DD] dark:border-transparent" />
                    <div className="w-[10px] h-[10px] rounded-[3px] bg-[#21D89A]" />
                    <span className="text-text-muted text-[10px] font-medium">More</span>
                </div>
            </div>

            {/* Month labels */}
            <div className="relative mb-2" style={{ height: 14 }}>
                {monthLabels.map(({ index, label }, i) => (
                    <span
                        key={`${label}-${i}`}
                        className="text-text-muted text-[10px] font-semibold absolute whitespace-nowrap"
                        style={{ left: `${(index / totalWeeks) * 100}%` }}
                    >
                        {label}
                    </span>
                ))}
            </div>

            {/* Grid — no day labels, clean */}
            <div
                className="w-full grid"
                style={{
                    gridTemplateColumns: `repeat(${totalWeeks}, 1fr)`,
                    gridTemplateRows: 'repeat(7, 1fr)',
                    gap: 4,
                }}
            >
                {weeks.map((week, wi) =>
                    week.map((day, di) => {
                        if (!day) return <div key={`${wi}-${di}`} />;

                        const dateStr = format(day, 'yyyy-MM-dd');
                        const data = dayData[dateStr];
                        const status = data?.status || 'empty';
                        const style = getDotStyle(status);
                        const isTodayDay = isToday(day);
                        const isHovered = hoveredDay === dateStr;
                        const isOutside = status === 'outside';

                        return (
                            <div
                                key={`${wi}-${di}`}
                                className="relative"
                                style={{ gridColumn: wi + 1, gridRow: di + 1 }}
                                onMouseEnter={() => !isOutside && setHoveredDay(dateStr)}
                                onMouseLeave={() => setHoveredDay(null)}
                            >
                                <div
                                    className={`
                                        w-full aspect-square rounded-[3px] transition-all duration-150
                                        ${style}
                                        ${isTodayDay ? 'ring-2 ring-[#047857] dark:ring-[#21D89A] ring-offset-2 ring-offset-bg-card' : ''}
                                        ${!isOutside ? 'cursor-pointer hover:brightness-110 hover:scale-[1.25]' : ''}
                                    `}
                                />

                                {isHovered && data && !isOutside && (
                                    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2.5 bg-bg-card-strong border border-border-card rounded-xl px-3.5 py-2.5 whitespace-nowrap shadow-md pointer-events-none">
                                        <p className="text-text-main text-[11px] font-bold">{format(day, 'EEE, MMM d')}</p>
                                        {data.total > 0 ? (
                                            <p className={`text-[10px] mt-0.5 ${getTooltipColor(status)}`}>
                                                {data.completed}/{data.total} completed • {data.rate}%
                                            </p>
                                        ) : (
                                            <p className="text-text-muted text-[10px] mt-0.5">No routines</p>
                                        )}
                                        <div className="absolute -bottom-[4px] left-1/2 -translate-x-1/2 w-[8px] h-[8px] bg-bg-card-strong border-r border-b border-border-card rotate-45" />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
