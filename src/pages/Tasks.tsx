import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Search, LayoutGrid, List } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useAppStore } from '../store';
import { TaskCard } from '../components/tasks/TaskCard';
import { TaskForm } from '../components/tasks/TaskForm';
import { Modal } from '../components/ui/Modal';
import type { Task } from '../types';
import { updateDocById } from '../firebase/firestore';
import toast from 'react-hot-toast';

const STATUS_COLUMNS = [
    { key: 'open', label: 'Open', color: 'border-slate-600' },
    { key: 'in_progress', label: 'In Progress', color: 'border-cyan-500' },
    { key: 'done', label: 'Done', color: 'border-emerald-500' },
    { key: 'overdue', label: 'Task Due', color: 'border-rose-500' },
] as const;

export const Tasks: React.FC = () => {
    const { tasks } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [editTask, setEditTask] = useState<Task | undefined>();
    const [view, setView] = useState<'kanban' | 'list'>('kanban');
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');

    const filtered = tasks.filter((t) => {
        const matchSearch = t.title.toLowerCase().includes(search.toLowerCase()) || t.description?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || t.type === filterType;
        const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
        return matchSearch && matchType && matchPriority;
    });

    const openEdit = (task: Task) => { setEditTask(task); setShowForm(true); };
    const closeForm = () => { setEditTask(undefined); setShowForm(false); };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        const newStatus = destination.droppableId as Task['status'];
        const task = tasks.find(t => t.id === draggableId);

        try {
            // Claim orphan task first so the subsequent write is permitted by Firestore rules
            if (task && !task.owner_id) {
                const { auth } = await import('../firebase/config');
                if (auth.currentUser) {
                    await updateDocById('tasks', draggableId, { owner_id: auth.currentUser.uid });
                }
            }
            await updateDocById('tasks', draggableId, { status: newStatus });
            toast.success(`Moved to ${newStatus.replace('_', ' ')}`);
        } catch (error) {
            toast.error('Failed to move task — check your permissions.');
            console.error(error);
        }
    };


    return (
        <div className="h-full flex flex-col gap-6">
            {/* Toolbar */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 flex-wrap glass-card p-3 rounded-2xl"
            >
                <div className="relative flex-1 min-w-full sm:min-w-[300px]">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        className="w-full bg-white/[0.03] border border-white/[0.08] text-[#f8fafc] rounded-xl pl-11 pr-4 py-2.5 text-sm focus:outline-none focus:border-[#26f7b2] focus:ring-4 focus:ring-[#26f7b2]/5 transition-all placeholder:text-slate-500"
                        placeholder="Search by title, description, or tags..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
                    <select className="bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#26f7b2] focus:ring-4 focus:ring-[#26f7b2]/5 cursor-pointer hover:bg-white/[0.06] transition-all flex-shrink-0" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                        <option value="all">📁 All Types</option>
                        <option value="personal">👤 Personal</option>
                        <option value="project">🚀 Project</option>
                        <option value="client">🤝 Client</option>
                    </select>

                    <select className="bg-white/[0.03] border border-white/[0.08] text-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#26f7b2] focus:ring-4 focus:ring-[#26f7b2]/5 cursor-pointer hover:bg-white/[0.06] transition-all flex-shrink-0" value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>
                        <option value="all">⚡ All Priorities</option>
                        <option value="high">🔴 High</option>
                        <option value="medium">🟡 Medium</option>
                        <option value="low">🟢 Low</option>
                    </select>
                </div>

                <div className="h-8 w-[1px] bg-white/[0.08] mx-1 hidden sm:block" />

                <div className="flex p-1 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                    <button onClick={() => setView('kanban')} className={`p-2 rounded-lg transition-all ${view === 'kanban' ? 'bg-[#26f7b2] text-black shadow-[0_0_15px_rgba(38,247,178,0.3)]' : 'text-slate-500 hover:text-[#26f7b2]'}`}>
                        <LayoutGrid size={18} />
                    </button>
                    <button onClick={() => setView('list')} className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-[#26f7b2] text-black shadow-[0_0_15px_rgba(38,247,178,0.3)]' : 'text-slate-500 hover:text-[#26f7b2]'}`}>
                        <List size={18} />
                    </button>
                </div>

                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#26f7b2] to-[#009d9a] hover:opacity-90 text-black text-sm font-bold rounded-xl transition-all shadow-lg shadow-[#26f7b2]/20 active:scale-95 w-full sm:w-auto justify-center sm:justify-start mt-2 sm:mt-0"
                >
                    <Plus size={18} strokeWidth={3} /> NEW TASK
                </button>
            </motion.div>

            {/* Kanban View */}
            {view === 'kanban' && (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex-1 flex flex-row gap-4 md:gap-6 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent snap-x snap-mandatory md:snap-none">
                        {STATUS_COLUMNS.map(({ key, label, color }, idx) => {
                            const isOverdue = (t: Task) => t.due_date && new Date(t.due_date) < new Date(new Date().setHours(0, 0, 0, 0));
                            const colTasks = filtered.filter((t) => {
                                if (t.status === 'done') return key === 'done';
                                if (t.status === 'overdue' || isOverdue(t)) return key === 'overdue';
                                return t.status === key;
                            });
                            return (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="flex flex-col gap-4 min-w-[280px] max-w-[280px] md:min-w-[320px] md:max-w-[320px] snap-center shrink-0"
                                >
                                    <div className={`flex items-center justify-between p-3 rounded-t-xl bg-white/[0.02] border-b-2 ${color.replace('border-', 'border-b-').replace('600', '400')}`}>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${color.replace('border-', 'bg-')}`} />
                                            <span className="text-slate-200 text-sm font-bold uppercase tracking-wider">{label}</span>
                                        </div>
                                        <span className="text-[10px] font-black bg-white/[0.03] text-slate-400 px-2 py-0.5 rounded-md border border-white/[0.08]">
                                            {colTasks.length}
                                        </span>
                                    </div>

                                    <Droppable droppableId={key}>
                                        {(provided) => (
                                            <div
                                                {...provided.droppableProps}
                                                ref={provided.innerRef}
                                                className="flex flex-col gap-4 flex-1 overflow-y-auto max-h-[calc(100vh-280px)] md:max-h-[calc(100vh-320px)] pr-2 custom-scrollbar min-h-[150px]"
                                            >
                                                <AnimatePresence mode="popLayout">
                                                    {colTasks.map((task, index) => (
                                                        <Draggable key={task.id} draggableId={task.id} index={index}>
                                                            {(draggableProvided) => (
                                                                <div
                                                                    ref={draggableProvided.innerRef}
                                                                    {...draggableProvided.draggableProps}
                                                                    {...draggableProvided.dragHandleProps}
                                                                >
                                                                    <TaskCard task={task} onEdit={openEdit} />
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                </AnimatePresence>
                                                {provided.placeholder}

                                                {colTasks.length === 0 && (
                                                    <motion.div
                                                        initial={{ opacity: 0 }}
                                                        animate={{ opacity: 1 }}
                                                        className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]"
                                                    >
                                                        <div className="w-12 h-12 rounded-full bg-white/[0.03] flex items-center justify-center mb-3 text-slate-600">
                                                            <Plus size={24} />
                                                        </div>
                                                        <p className="text-slate-500 text-xs font-medium italic">Drop tasks here or create new</p>
                                                    </motion.div>
                                                )}
                                            </div>
                                        )}
                                    </Droppable>
                                </motion.div>
                            );
                        })}
                    </div>
                </DragDropContext>
            )}

            {/* List View */}
            {view === 'list' && (
                <div className="flex flex-col gap-2">
                    {filtered.length === 0 && <div className="text-center py-16 text-slate-500">No tasks found</div>}
                    {filtered.map((task) => <TaskCard key={task.id} task={task} onEdit={openEdit} compact />)}
                </div>
            )}

            <Modal isOpen={showForm} onClose={closeForm} title={editTask ? 'Edit Task' : 'New Task'} size="lg">
                <TaskForm onClose={closeForm} editTask={editTask} />
            </Modal>
        </div>
    );
};
