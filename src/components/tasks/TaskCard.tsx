import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Tag, Calendar, Play, Square, Timer, Pencil, Trash2, Loader2, Users, FolderKanban, Archive, ArchiveRestore } from 'lucide-react';
import type { Task } from '../../types';
import { statusBadge, priorityBadge, typeBadge } from '../ui/Badge';
import { formatDuration, formatDate, isOverdue } from '../../utils/timeFormat';
import { useTimer } from '../../hooks/useTimer';
import { deleteDocById, updateDocById } from '../../firebase/firestore';
import { auth } from '../../firebase/config';
import { useAppStore } from '../../store';
import toast from 'react-hot-toast';
import { TaskDetailsModal } from './TaskDetailsModal';

interface TaskCardProps {
    task: Task;
    onEdit: (task: Task) => void;
    compact?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, compact = false }) => {
    const { isRunning, elapsed, start, stop } = useTimer(task);
    const overdue = task.due_date ? isOverdue(task.due_date) && task.status !== 'done' : false;
    const [deleting, setDeleting] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    // Resolve client and project names from store
    const { clients, projects } = useAppStore();
    const clientName = task.client_id ? clients.find(c => c.id === task.client_id)?.name : null;
    const projectName = task.project_id ? projects.find(p => p.id === task.project_id)?.name : null;

    // Permission checks
    const uid = auth.currentUser?.uid;
    const isOwner = uid === task.owner_id;
    const isAssignee = uid === task.assignee_id;
    const isProjectMember = task.project_member_uids?.includes(uid || '');
    const canInteract = isOwner || isAssignee || isProjectMember; // Can edit, set timer
    const canDelete = isOwner; // Only owner can delete

    const handleDelete = async () => {
        if (!confirm('Delete this task? You can restore it from Archive within 30 days.')) return;
        setDeleting(true);
        try {
            if (!task.owner_id && auth.currentUser) {
                await updateDocById('tasks', task.id, { owner_id: auth.currentUser.uid });
            }
            await deleteDocById('tasks', task.id);
            toast.success('Task moved to Archive');
        } catch (err) {
            console.error('Delete task error:', err);
            toast.error('Failed to delete task. Check your connection and try again.');
        } finally {
            setDeleting(false);
        }
    };

    const handleArchiveToggle = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await updateDocById('tasks', task.id, { is_archived: !task.is_archived });
            toast.success(task.is_archived ? 'Task unarchived' : 'Task archived');
        } catch (err) {
            toast.error('Failed to change archive status');
        }
    };

    const totalMs = task.total_time_ms + (isRunning ? elapsed : 0);

    // Dynamic left border colors representing columns/states
    const leftBorderColor = task.status === 'done' ? 'border-l-[#21D89A]' :
        task.status === 'in_progress' ? 'border-l-[#0369A1]' :
            overdue ? 'border-l-[#EF476F]' : 'border-l-[#6B7C73]';

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            whileHover={{ y: -2 }}
            className={`group bg-white dark:bg-bg-card border border-border-card ${leftBorderColor} border-l-4 rounded-2xl p-5 relative overflow-hidden shadow-[0_6px_18px_rgba(16,35,27,0.04)] hover:shadow-[0_8px_24px_rgba(16,35,27,0.06)] transition-all duration-300`}
        >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    <button
                        onClick={() => setShowDetails(true)}
                        className="text-text-main font-bold text-sm leading-relaxed line-clamp-2 hover:text-[#047857] dark:hover:text-glitch-emerald text-left transition-colors cursor-pointer"
                    >
                        {task.title}
                    </button>
                </div>
                <div className="flex items-center gap-1 transition-all opacity-80 group-hover:opacity-100">
                    {canInteract && (
                        <button onClick={(e) => handleArchiveToggle(e)} className={`p-1.5 rounded-lg transition-all cursor-pointer ${task.is_archived ? 'text-[#92400E] bg-[#FEF3C7] hover:bg-[#FEF3C7]/80' : 'text-text-muted hover:text-[#047857] hover:bg-[#DDFBF0]'}`} title={task.is_archived ? "Unarchive Task" : "Archive Task"}>
                            {task.is_archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                        </button>
                    )}
                    {canInteract && (
                        <button onClick={() => onEdit(task)} className="p-1.5 rounded-lg text-text-muted hover:text-[#047857] hover:bg-[#DDFBF0] transition-all cursor-pointer">
                            <Pencil size={14} />
                        </button>
                    )}
                    {canDelete && (
                        <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg text-text-muted hover:text-[#BE123C] hover:bg-[#FFE4E8] transition-all disabled:opacity-40 cursor-pointer">
                            {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                        </button>
                    )}
                </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mb-4">
                {statusBadge(task.status)}
                {priorityBadge(task.priority)}
                {typeBadge(task.type)}
            </div>

            {/* Meta info */}
            {!compact && (
                <div className="space-y-1.5 mb-4">
                    {/* Client */}
                    {clientName && (
                        <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg text-[#0369A1] bg-[#E0F2FE] border border-transparent">
                            <Users size={11} className="flex-shrink-0" />
                            <span className="font-bold truncate">{clientName}</span>
                        </div>
                    )}
                    {/* Project */}
                    {projectName && (
                        <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg text-[#5B21B6] bg-[#EDE9FE] border border-transparent">
                            <FolderKanban size={11} className="flex-shrink-0" />
                            <span className="font-bold truncate">{projectName}</span>
                        </div>
                    )}
                    {/* Assignee indicator for shared tasks */}
                    {task.assignee_name && (
                        <div className="flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg text-[#6B7C73] bg-[#F3F7F5] border border-transparent">
                            <Users size={11} className="flex-shrink-0" />
                            <span className="font-bold truncate">Assigned: {task.assignee_name}{isAssignee ? ' (You)' : ''}</span>
                        </div>
                    )}
                    {/* Due date */}
                    {task.due_date && (
                        <div className={`flex items-center gap-2 text-xs py-1 px-2.5 rounded-lg ${overdue ? 'text-[#BE123C] bg-[#FFE4E8]' : 'text-text-muted bg-[#F3F7F5]'}`}>
                            <Calendar size={13} className={overdue ? 'animate-pulse' : ''} />
                            <span className="font-bold">{overdue ? 'Overdue · ' : ''}{formatDate(task.due_date)}</span>
                        </div>
                    )}
                    {/* Tags */}
                    {task.tags?.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pl-1">
                            {task.tags.map((t) => (
                                <span key={t} className="text-[10px] text-text-muted bg-[#F3F7F5] border border-border-input px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Tag size={10} /> {t}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Timer Row */}
            <div className="flex items-center justify-between pt-4 border-t border-border-card">
                <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${isRunning ? 'bg-[#DDFBF0] text-[#047857]' : 'bg-bg-input text-text-muted'}`}>
                        <Timer size={14} className={isRunning ? 'animate-spin-slow' : ''} />
                    </div>
                    <span className={`text-xs font-mono font-bold tracking-tight ${isRunning ? 'text-[#047857] dark:text-glitch-emerald' : 'text-text-muted'}`}>
                        {totalMs > 0 ? formatDuration(totalMs) : '00:00:00'}
                    </span>
                </div>
                {canInteract ? (
                    <button
                        onClick={isRunning ? stop : start}
                        className={`flex items-center gap-1.5 px-4 py-1.5 rounded-[10px] text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer ${isRunning
                            ? 'bg-[#EF476F] text-white hover:bg-opacity-90 shadow-sm'
                            : 'bg-[#21D89A] text-[#053B2A] font-bold shadow-[0_4px_12px_rgba(33,216,154,0.2)] hover:opacity-90'
                            }`}
                    >
                        {isRunning ? <Square size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                        {isRunning ? 'STOP' : 'START'}
                    </button>
                ) : (
                    <span className="text-[10px] text-text-muted/60 font-bold uppercase tracking-widest">View Only</span>
                )}
            </div>
            {showDetails && <TaskDetailsModal task={task} onClose={() => setShowDetails(false)} />}
        </motion.div>
    );
};
