import React from 'react';
import { Building2, Phone, Mail, CheckSquare, StickyNote, Globe } from 'lucide-react';
import { useAppStore } from '../../store';
import { Modal } from '../ui/Modal';
import { TaskCard } from '../tasks/TaskCard';
import { statusBadge } from '../ui/Badge';

interface ClientDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: string | null;
}

export const ClientDetailsModal: React.FC<ClientDetailsModalProps> = ({ isOpen, onClose, clientId }) => {
    const { clients, tasks, projects } = useAppStore();

    if (!clientId || !isOpen) return null;

    const client = clients.find((c) => c.id === clientId);

    if (!client) {
        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Client Details" size="md">
                <div className="flex flex-col items-center justify-center p-8 text-text-muted">
                    <Building2 size={48} className="mb-4 opacity-20" />
                    <p>Client not found</p>
                </div>
            </Modal>
        );
    }

    const clientTasks = tasks.filter((t) => t.client_id === clientId);
    const clientProjects = projects.filter((p) => p.client_id === clientId);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Client: ${client.name}`} size="xl">
            <div className="space-y-8 pb-4">
                {/* Header Info */}
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-4 text-text-muted mt-1">
                            <p className="flex items-center gap-1.5 font-bold text-sm">
                                <Building2 size={16} className="text-[#047857] dark:text-[#21D89A]" /> {client.company || 'Private Client'}
                            </p>
                            {client.website && (
                                <a
                                    href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 text-[#047857] dark:text-[#21D89A] hover:underline transition-colors bg-[#DDFBF0] dark:bg-[#21D89A]/10 px-2 py-0.5 rounded-md border border-[#B7F3DD] dark:border-[#21D89A]/20 text-xs font-bold shadow-sm"
                                >
                                    <Globe size={12} /> Website
                                </a>
                            )}
                        </div>
                        {client.description && (
                            <p className="text-text-main text-sm mt-3 max-w-2xl leading-relaxed italic">{client.description}</p>
                        )}
                    </div>
                </div>

                {/* Contact Info Card */}
                {((client.phones?.length ?? 0) > 0 || (client.emails?.length ?? 0) > 0) && (
                    <div className="bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[22px] p-5 shadow-sm">
                        <h2 className="text-[#047857] dark:text-[#21D89A] text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                            <Phone size={13} className="text-[#047857] dark:text-[#21D89A]" /> Contact Information
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {client.phones?.map(p => (
                                <a key={p} href={`tel:${p}`}
                                    className="flex items-center gap-3 p-3 bg-bg-card border border-border-card dark:border-[#22372D] rounded-xl hover:border-[#047857]/40 dark:hover:border-[#21D89A]/40 hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] group transition-all shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-[#DDFBF0] dark:bg-[#21D89A]/10 border border-[#B7F3DD] dark:border-[#21D89A]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#DDFBF0]/50 transition-all shadow-sm">
                                        <Phone size={14} className="text-[#047857] dark:text-[#21D89A]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Phone</p>
                                        <p className="text-text-main text-sm font-bold group-hover:text-[#047857] dark:group-hover:text-[#21D89A] transition-colors">{p}</p>
                                    </div>
                                </a>
                            ))}
                            {client.emails?.map(e => (
                                <a key={e} href={`mailto:${e}`}
                                    className="flex items-center gap-3 p-3 bg-bg-card border border-border-card dark:border-[#22372D] rounded-xl hover:border-[#0369A1]/40 dark:hover:border-cyan-500/40 hover:bg-[#E0F2FE]/40 dark:hover:bg-[#1A2B23] group transition-all shadow-sm">
                                    <div className="w-8 h-8 rounded-lg bg-[#E0F2FE] dark:bg-[#047857]/10 border border-[#BAE6FD] dark:border-[#047857]/20 flex items-center justify-center flex-shrink-0 group-hover:bg-[#E0F2FE]/80 transition-all shadow-sm">
                                        <Mail size={14} className="text-[#0369A1] dark:text-cyan-300" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider">Email</p>
                                        <p className="text-text-main text-sm font-bold group-hover:text-[#0369A1] dark:group-hover:text-cyan-300 transition-colors truncate">{e}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Internal Client Notes */}
                {client.notes && (
                    <div className="bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[22px] p-5 shadow-sm">
                        <h2 className="text-text-main text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <StickyNote size={13} className="text-amber-500" /> Internal Notes
                        </h2>
                        <p className="text-text-muted text-sm whitespace-pre-wrap leading-relaxed bg-bg-card border border-border-card p-4 rounded-xl shadow-sm">{client.notes}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Projects */}
                    <section className="bg-[#F3F7F5] dark:bg-[#0D1612] p-5 rounded-[22px] border border-border-card dark:border-[#22372D] shadow-sm">
                        <h2 className="text-text-main font-black mb-4 flex items-center gap-2">
                            <Building2 size={16} className="text-[#047857] dark:text-[#21D89A]" /> Projects ({clientProjects.length})
                        </h2>
                        <div className="space-y-3">
                            {clientProjects.map(p => (
                                <div key={p.id} className="p-3 bg-bg-card border border-border-card rounded-xl shadow-sm">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-text-main font-bold text-sm">{p.name}</h3>
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {statusBadge(p.status)}
                                    </div>
                                </div>
                            ))}
                            {clientProjects.length === 0 && <p className="text-text-muted text-xs italic py-4 text-center rounded-xl bg-bg-card border border-border-card shadow-sm">No projects found</p>}
                        </div>
                    </section>

                    {/* Tasks */}
                    <section className="bg-[#F3F7F5] dark:bg-[#0D1612] p-5 rounded-[22px] border border-border-card dark:border-[#22372D] shadow-sm">
                        <h2 className="text-text-main font-black mb-4 flex items-center gap-2">
                            <CheckSquare size={16} className="text-[#047857] dark:text-[#21D89A]" /> Active Tasks ({clientTasks.length})
                        </h2>
                        <div className="space-y-3">
                            {clientTasks.map(t => (
                                <TaskCard key={t.id} task={t} onEdit={() => { }} compact />
                            ))}
                            {clientTasks.length === 0 && <p className="text-text-muted text-xs italic py-4 text-center rounded-xl bg-bg-card border border-border-card shadow-sm">No active tasks</p>}
                        </div>
                    </section>
                </div>
            </div>
        </Modal>
    );
};
