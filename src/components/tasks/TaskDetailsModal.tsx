import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock, Tag, FolderKanban, Users, UserCircle, AlignLeft, Activity, Archive, ArchiveRestore } from 'lucide-react';
import type { Task } from '../../types';
import { statusBadge, priorityBadge, typeBadge } from '../ui/Badge';
import { formatDuration, formatDate } from '../../utils/timeFormat';
import { useAppStore } from '../../store';
import { auth, db, APP_ID } from '../../firebase/config';
import { updateDoc, doc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Send, MessageSquareText } from 'lucide-react';

interface TaskDetailsModalProps {
    task: Task;
    onClose: () => void;
}

export const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({ task, onClose }) => {
    const { clients, projects } = useAppStore();
    const [noteContent, setNoteContent] = React.useState('');
    const [submittingNote, setSubmittingNote] = React.useState(false);
    const [isTransferring, setIsTransferring] = React.useState(false);
    const [transferProjectId, setTransferProjectId] = React.useState('');
    const [transferring, setTransferring] = React.useState(false);

    const clientName = task.client_id ? clients.find(c => c.id === task.client_id)?.name : null;
    const projectName = task.project_id ? projects.find(p => p.id === task.project_id)?.name : null;

    const uid = auth.currentUser?.uid;
    const isOwner = uid === task.owner_id;
    const isAssignee = uid === task.assignee_id;
    const isProjectMember = task.project_member_uids?.includes(uid || '');
    const canPostNote = isOwner || isAssignee || isProjectMember;

    const handleAddNote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!noteContent.trim() || !uid) return;

        setSubmittingNote(true);
        try {
            const newNote = {
                id: crypto.randomUUID(),
                content: noteContent.trim(),
                author_id: uid,
                author_name: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
                created_at: serverTimestamp()
            };

            const taskRef = doc(db, `apps/${APP_ID}/tasks`, task.id);
            await updateDoc(taskRef, {
                notes: arrayUnion(newNote)
            });

            setNoteContent('');
            toast.success('Note added');
        } catch (err) {
            console.error(err);
            toast.error('Failed to add note');
        } finally {
            setSubmittingNote(false);
        }
    };

    const handleTransfer = async () => {
        setTransferring(true);
        try {
            const proj = projects.find(p => p.id === transferProjectId);
            const isUser = task.assignee_id === uid;
            const isProjMem = proj?.members?.some(m => m.uid === task.assignee_id);
            const newAssigneeId = isUser || isProjMem ? task.assignee_id : null;

            const taskRef = doc(db, `apps/${APP_ID}/tasks`, task.id);
            await updateDoc(taskRef, {
                project_id: transferProjectId || null,
                project_member_uids: proj ? proj.member_uids : [],
                assignee_id: newAssigneeId
            });
            toast.success('Task transferred');
            setIsTransferring(false);
        } catch (err) {
            console.error(err);
            toast.error('Failed to transfer task');
        } finally {
            setTransferring(false);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <AnimatePresence>
            <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-[#060d11]/70 backdrop-blur-md"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="relative w-full max-w-2xl glass-card-strong shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header Strip */}
                    <div className={`h-2 w-full ${task.status === 'done' ? 'bg-[#21D89A]' :
                        task.status === 'in_progress' ? 'bg-indigo-500' :
                        task.status === 'overdue' ? 'bg-red-500' : 'bg-border-card'
                        }`} />

                    {/* Header Content */}
                    <div className="flex items-start justify-between p-6 border-b border-border-card bg-bg-card/80 backdrop-blur-xl sticky top-0 z-10">
                        <div className="pr-8">
                            <h2 className="text-2xl font-bold text-text-main mb-3 font-display tracking-tight">{task.title}</h2>
                            <div className="flex flex-wrap gap-2">
                                {statusBadge(task.status)}
                                {priorityBadge(task.priority)}
                                {typeBadge(task.type)}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {(isOwner || isAssignee || isProjectMember) && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const taskRef = doc(db, `apps/${APP_ID}/tasks`, task.id);
                                            await updateDoc(taskRef, { is_archived: !task.is_archived });
                                            toast.success(task.is_archived ? 'Task unarchived' : 'Task archived');
                                            onClose();
                                        } catch (e) { toast.error('Failed to change archive status'); }
                                    }}
                                    className={`p-2 rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0 flex items-center justify-center ${task.is_archived ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-bg-input hover:bg-border-card/50 text-text-muted hover:text-text-main'}`}
                                    title={task.is_archived ? 'Unarchive Task' : 'Archive Task'}
                                >
                                    {task.is_archived ? <ArchiveRestore size={20} /> : <Archive size={20} />}
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 bg-bg-input hover:bg-border-card/50 text-text-muted hover:text-text-main rounded-xl transition-all duration-200 cursor-pointer flex-shrink-0"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Body */}
                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8 bg-bg-card/30">

                        {/* Summary Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Assignee */}
                            <div className="bg-bg-input/60 rounded-xl p-3 border border-border-card/60">
                                <div className="flex items-center gap-2 mb-1">
                                    <UserCircle size={14} className="text-indigo-500 dark:text-indigo-400" />
                                    <span className="text-[10px] uppercase font-bold text-text-muted/80 tracking-wider">Assignee</span>
                                </div>
                                <p className="text-sm font-semibold text-text-main truncate">
                                    {task.assignee_name || task.assignee_email || 'Unassigned'}
                                </p>
                            </div>

                            {/* Client */}
                            <div className="bg-bg-input/60 rounded-xl p-3 border border-border-card/60">
                                <div className="flex items-center gap-2 mb-1">
                                    <Users size={14} className="text-[#047857] dark:text-[#21D89A]" />
                                    <span className="text-[10px] uppercase font-bold text-text-muted/80 tracking-wider">Client</span>
                                </div>
                                <p className="text-sm font-semibold text-text-main truncate">
                                    {clientName || 'None'}
                                </p>
                            </div>

                            {/* Project */}
                            <div className="bg-bg-input/60 rounded-xl p-3 border border-border-card/60">
                                <div className="flex items-center gap-2 mb-1">
                                    <FolderKanban size={14} className="text-amber-500 dark:text-amber-400" />
                                    <span className="text-[10px] uppercase font-bold text-text-muted/80 tracking-wider">Project</span>
                                </div>
                                {isTransferring ? (
                                    <div className="flex flex-col gap-2 mt-1.5">
                                        <select
                                            className="w-full bg-bg-card border border-border-input text-text-main rounded p-1.5 text-xs focus:outline-none focus:border-[#21D89A]"
                                            value={transferProjectId}
                                            onChange={e => setTransferProjectId(e.target.value)}
                                        >
                                            <option value="">— No project —</option>
                                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="flex items-center gap-2">
                                            <button onClick={handleTransfer} disabled={transferring} className="flex-1 py-1 bg-[#047857] hover:bg-[#035e44] text-white font-bold text-[10px] rounded hover:opacity-90 disabled:opacity-50">Save</button>
                                            <button onClick={() => setIsTransferring(false)} className="flex-1 py-1 bg-bg-input border border-border-card text-text-main font-bold text-[10px] rounded hover:bg-border-card/50">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-text-main truncate">
                                            {projectName || 'None'}
                                        </p>
                                        {(isOwner || isAssignee) && (
                                            <button onClick={() => { setTransferProjectId(task.project_id || ''); setIsTransferring(true); }} className="text-[10px] font-bold text-[#047857] dark:text-[#21D89A] px-2 py-0.5 rounded bg-[#DDFBF0] dark:bg-[#1C3E32] transition-colors">
                                                Transfer
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Due Date */}
                            <div className="bg-bg-input/60 rounded-xl p-3 border border-border-card/60">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar size={14} className="text-rose-500 dark:text-rose-400" />
                                    <span className="text-[10px] uppercase font-bold text-text-muted/80 tracking-wider">Due Date</span>
                                </div>
                                <p className="text-sm font-semibold text-text-main truncate">
                                    {task.due_date ? formatDate(task.due_date) : 'No due date'}
                                </p>
                            </div>
                        </div>

                        {/* Description Section */}
                        <div className="bg-bg-input/30 rounded-xl p-5 border border-border-card">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-text-main mb-3 border-b border-border-card pb-2">
                                <AlignLeft size={16} className="text-text-muted" />
                                Description Details
                            </h3>
                            <div className="text-sm text-text-muted whitespace-pre-wrap leading-relaxed">
                                {task.description ? task.description : <span className="italic text-text-muted/60">No description provided for this task.</span>}
                            </div>
                        </div>

                        {/* Additional Info Row (Tags & Time) */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Meta Metrics */}
                            <div className="space-y-4">
                                <h3 className="flex items-center gap-2 text-sm font-bold text-text-main mb-3 border-b border-border-card pb-2">
                                    <Activity size={16} className="text-text-muted" />
                                    Metrics & Tags
                                </h3>

                                <div className="flex items-center justify-between bg-bg-input/60 p-3 rounded-xl border border-border-card">
                                    <div className="flex items-center gap-2 text-text-muted">
                                        <Clock size={16} className="text-indigo-500 dark:text-indigo-400" />
                                        <span className="text-xs font-semibold uppercase">Total Tracked Time</span>
                                    </div>
                                    <span className="text-sm font-mono font-bold text-[#047857] dark:text-[#21D89A]">{formatDuration(task.total_time_ms || 0)}</span>
                                </div>

                                {task.tags && task.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {task.tags.map(tag => (
                                            <span key={tag} className="flex items-center gap-1.5 px-3 py-1 bg-bg-input text-text-main rounded-lg text-xs font-medium border border-border-card">
                                                <Tag size={12} className="text-text-muted" />
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Notes & Updates Section */}
                        <div className="bg-bg-input/30 rounded-xl p-5 border border-border-card space-y-4">
                            <h3 className="flex items-center gap-2 text-sm font-bold text-text-main border-b border-border-card pb-2">
                                <MessageSquareText size={16} className="text-indigo-500 dark:text-indigo-400" />
                                Task Updates & Notes
                            </h3>

                            {/* Notes Feed */}
                            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar pr-2">
                                {task.notes && task.notes.length > 0 ? (
                                    [...(task.notes || [])].sort((a, b) => b.created_at.getTime() - a.created_at.getTime()).map(note => (
                                        <div key={note.id} className="p-3 bg-bg-card rounded-xl border border-border-card text-xs">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="font-bold text-[#047857] dark:text-[#21D89A]">{note.author_name}</span>
                                                <span className="text-text-muted/80 text-[10px]">{formatDate(note.created_at)}</span>
                                            </div>
                                            <p className="text-text-main leading-relaxed whitespace-pre-wrap">{note.content}</p>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-center py-4 text-text-muted/70 text-[11px] italic">No updates posted yet.</p>
                                )}
                            </div>

                            {/* Add Note Input */}
                            {canPostNote && (
                                <form onSubmit={handleAddNote} className="relative pt-2">
                                    <textarea
                                        value={noteContent}
                                        onChange={(e) => setNoteContent(e.target.value)}
                                        placeholder="Add a progress update..."
                                        className="w-full bg-bg-card border border-border-input rounded-xl px-4 py-3 text-xs text-text-main placeholder:text-text-muted/50 focus:outline-none focus:border-[#21D89A] transition-all resize-none min-h-[80px]"
                                    />
                                    <button
                                        type="submit"
                                        disabled={submittingNote || !noteContent.trim()}
                                        className="absolute right-3 bottom-3 p-2 bg-[#21D89A] hover:bg-[#047857] disabled:opacity-40 text-[#10231B] hover:text-white rounded-lg transition-all shadow-sm"
                                    >
                                        <Send size={14} className={submittingNote ? 'animate-pulse' : ''} />
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>,
        document.body
    );
};
