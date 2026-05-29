import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FolderKanban, Pencil, Trash2, CheckSquare, Calendar, ExternalLink, Timer } from 'lucide-react';
import { useAppStore } from '../store';
import { ProjectForm } from '../components/projects/ProjectForm';
import { Modal } from '../components/ui/Modal';
import type { Project } from '../types';
import { deleteDocById } from '../firebase/firestore';
import { statusBadge, priorityBadge } from '../components/ui/Badge';
import { formatDuration } from '../utils/timeFormat';
import toast from 'react-hot-toast';

export const Projects: React.FC = () => {
    const navigate = useNavigate();
    const { projects, tasks, meetings, clients } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [editProject, setEditProject] = useState<Project | undefined>();

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this project?')) return;
        await deleteDocById('projects', id);
        toast.success('Project deleted');
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-text-muted text-sm">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                <button 
                    onClick={() => setShowForm(true)} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-glitch-emerald text-[#053B2A] text-sm font-bold rounded-xl shadow-[0_8px_20px_rgba(33,216,154,0.2)] hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                    <Plus size={16} /> New Project
                </button>
            </div>

            {projects.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-bg-card border border-border-card rounded-[22px] p-8 shadow-sm">
                    <FolderKanban size={48} className="text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted">No projects yet. Create your first project!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projects.map((project) => {
                        const projectTasks = tasks.filter((t) => t.project_id === project.id);
                        const doneTasks = projectTasks.filter((t) => t.status === 'done').length;
                        const projectMeetings = meetings.filter((m) => m.linked_project_id === project.id);
                        const progress = projectTasks.length > 0 ? Math.round((doneTasks / projectTasks.length) * 100) : 0;
                        const totalTrackedMs = projectTasks.reduce((sum, t) => sum + (t.total_time_ms || 0), 0);
                        const isDue = project.due_date && new Date(project.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) && project.status !== 'completed';

                        return (
                            <div key={project.id} className={`group rounded-[20px] p-6 transition-all ${isDue ? 'bg-[#FFE4E8] dark:bg-rose-950/20 border border-transparent text-[#BE123C]' : 'bg-white dark:bg-bg-card border border-border-card shadow-[0_4px_16px_rgba(16,35,27,0.03)] hover:shadow-[0_8px_24px_rgba(16,35,27,0.05)]'}`}>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: project.color || '#21D89A' }} />
                                        <h3
                                            className="text-text-main font-bold hover:text-[#047857] dark:hover:text-glitch-emerald cursor-pointer transition-colors truncate"
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                        >
                                            {project.name}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
                                        <button
                                            onClick={() => navigate(`/projects/${project.id}`)}
                                            className="p-1.5 text-text-muted hover:text-[#047857] hover:bg-[#DDFBF0] rounded-lg transition-all cursor-pointer"
                                            title="View Details"
                                        >
                                            <ExternalLink size={14} />
                                        </button>
                                        <button onClick={() => { setEditProject(project); setShowForm(true); }} className="p-1.5 text-text-muted hover:text-[#047857] hover:bg-[#DDFBF0] rounded-lg transition-all cursor-pointer">
                                            <Pencil size={13} />
                                        </button>
                                        <button onClick={() => handleDelete(project.id)} className="p-1.5 text-text-muted hover:text-[#BE123C] hover:bg-[#FFE4E8] rounded-lg transition-all cursor-pointer">
                                            <Trash2 size={13} />
                                        </button>
                                    </div>
                                </div>

                                {project.description && <p className="text-text-muted text-sm mb-3 line-clamp-2">{project.description}</p>}

                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                    {statusBadge(project.status)}
                                    {priorityBadge(project.priority || 'medium')}
                                    {project.client_id && (
                                        <span className="text-xs text-[#0369A1] bg-[#E0F2FE] px-2 py-0.5 rounded font-bold uppercase tracking-wide truncate max-w-[150px]">
                                            {clients.find(c => c.id === project.client_id)?.name || 'Unknown Client'}
                                        </span>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                {projectTasks.length > 0 && (
                                    <div className="mb-4">
                                        <div className="flex items-center justify-between text-xs text-text-muted mb-1">
                                            <span className="font-semibold">Progress</span>
                                            <span className="font-bold">{progress}%</span>
                                        </div>
                                        <div className="h-1.5 bg-[#E7EEE9] dark:bg-bg-input rounded-full overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: project.color || '#21D89A' }} />
                                        </div>
                                    </div>
                                )}

                                <div className="flex items-center gap-4 pt-3 border-t border-border-card">
                                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                        <CheckSquare size={12} />
                                        <span>{projectTasks.length} task{projectTasks.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-text-muted">
                                        <Calendar size={12} />
                                        <span>{projectMeetings.length} meeting{projectMeetings.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    {totalTrackedMs > 0 && (
                                        <div className="flex items-center gap-1.5 text-xs text-[#047857] dark:text-glitch-emerald ml-auto">
                                            <Timer size={12} />
                                            <span className="font-mono font-bold">{formatDuration(totalTrackedMs)}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal isOpen={showForm} onClose={() => { setEditProject(undefined); setShowForm(false); }} title={editProject ? 'Edit Project' : 'New Project'}>
                <ProjectForm onClose={() => { setEditProject(undefined); setShowForm(false); }} editProject={editProject} />
            </Modal>
        </div>
    );
};
