import React, { useState } from 'react';
import { Plus, Phone, Mail, Building2, Pencil, Trash2, FileArchive, ChevronDown, ChevronUp, ExternalLink, Globe } from 'lucide-react';
import { useAppStore } from '../store';
import { ClientForm } from '../components/clients/ClientForm';
import { ClientDetailsModal } from '../components/clients/ClientDetailsModal';
import { Modal } from '../components/ui/Modal';
import type { Client } from '../types';
import { deleteDocById } from '../firebase/firestore';
import toast from 'react-hot-toast';

export const Clients: React.FC = () => {
    const { clients } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [editClient, setEditClient] = useState<Client | undefined>();
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [search, setSearch] = useState('');

    const filtered = clients.filter((c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase())
    );

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this client?')) return;
        await deleteDocById('clients', id);
        toast.success('Client deleted');
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                    className="flex-1 bg-[#F3F7F5] dark:bg-bg-input border border-border-input dark:border-[#22372D] text-text-main placeholder-text-muted/40 rounded-[14px] px-4 py-2.5 text-sm focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                    placeholder="Search clients..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button 
                    onClick={() => setShowForm(true)} 
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                >
                    <Plus size={16} /> Add Client
                </button>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-20 bg-bg-card border border-border-card rounded-[22px] shadow-sm">
                    <Building2 size={48} className="text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted font-bold text-sm">No clients found</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filtered.map((client) => (
                        <div key={client.id} className="bg-bg-card border border-border-card rounded-[22px] overflow-hidden hover:border-[#21D89A]/50 dark:hover:border-[#21D89A]/30 transition-all shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-5">
                                <div className="w-10 h-10 rounded-xl bg-[#DDFBF0] dark:bg-[#21D89A]/10 flex items-center justify-center text-[#047857] dark:text-[#21D89A] font-bold text-sm flex-shrink-0 border border-[#B7F3DD] dark:border-[#21D89A]/20 shadow-sm">
                                    {client.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3
                                        className="text-text-main font-bold text-base hover:text-[#047857] dark:hover:text-[#21D89A] cursor-pointer transition-colors"
                                        onClick={() => setSelectedClientId(client.id)}
                                    >
                                        {client.name}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        {client.company && (
                                            <p className="text-text-muted text-xs flex items-center gap-1">
                                                <Building2 size={12} className="text-[#047857] dark:text-[#21D89A]" />
                                                {client.company}
                                            </p>
                                        )}
                                        {client.website && (
                                            <a
                                                href={client.website.startsWith('http') ? client.website : `https://${client.website}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-[#047857] dark:text-[#21D89A] hover:underline text-xs font-bold flex items-center gap-1 transition-all"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Globe size={12} /> {client.website}
                                            </a>
                                        )}
                                    </div>
                                    {client.description && <p className="text-text-muted text-xs mt-1 line-clamp-2 italic">{client.description}</p>}
                                </div>
                                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mt-2 sm:mt-0 w-full sm:w-auto">
                                    {client.phones?.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#047857] dark:text-[#21D89A] bg-[#DDFBF0] dark:bg-[#21D89A]/10 px-2.5 py-0.5 rounded-full border border-[#B7F3DD] dark:border-[#21D89A]/20">
                                            <Phone size={10} />{client.phones.length} Phone
                                        </span>
                                    )}
                                    {client.emails?.length > 0 && (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-[#0369A1] dark:text-cyan-300 bg-[#E0F2FE] dark:bg-[#047857]/10 px-2.5 py-0.5 rounded-full border border-[#BAE6FD] dark:border-[#047857]/20 ml-1">
                                            <Mail size={10} />{client.emails.length} Email
                                        </span>
                                    )}
                                    <div className="flex items-center gap-1 ml-2">
                                        <button
                                            onClick={() => setSelectedClientId(client.id)}
                                            className="p-2 text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] rounded-lg transition-all"
                                            title="View Details"
                                        >
                                            <ExternalLink size={16} />
                                        </button>
                                        <button 
                                            onClick={() => { setEditClient(client); setShowForm(true); }} 
                                            className="p-2 text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] rounded-lg transition-all"
                                            title="Edit Client"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(client.id)} 
                                            className="p-2 text-text-muted hover:text-rose-500 hover:bg-[#FFE4E8] dark:hover:bg-rose-950/30 rounded-lg transition-all"
                                            title="Delete Client"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setExpanded(expanded === client.id ? null : client.id)} 
                                        className="ml-auto sm:ml-0 p-1.5 text-text-muted hover:text-text-main hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] rounded-lg transition-all"
                                    >
                                        {expanded === client.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                    </button>
                                </div>
                            </div>

                            {expanded === client.id && (
                                <div className="px-5 pb-5 pt-4 border-t border-border-card dark:border-[#22372D] grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAF9]/50 dark:bg-[#111D17]/10">
                                    <div>
                                        <p className="text-[#047857] dark:text-[#21D89A] text-[10px] font-black uppercase tracking-wider mb-2">PHONE NUMBERS</p>
                                        {client.phones?.length ? client.phones.map((p) => (
                                            <div key={p} className="flex items-center gap-2 py-1">
                                                <Phone size={13} className="text-[#047857] dark:text-[#21D89A]" />
                                                <a href={`tel:${p}`} className="text-text-main text-sm hover:underline hover:text-[#047857] dark:hover:text-[#21D89A] transition-colors">{p}</a>
                                            </div>
                                        )) : <p className="text-text-muted text-sm italic">None specified</p>}
                                    </div>
                                    <div>
                                        <p className="text-[#047857] dark:text-[#21D89A] text-[10px] font-black uppercase tracking-wider mb-2">EMAIL ADDRESSES</p>
                                        {client.emails?.length ? client.emails.map((e) => (
                                            <div key={e} className="flex items-center gap-2 py-1">
                                                <Mail size={13} className="text-[#0369A1] dark:text-cyan-300" />
                                                <a href={`mailto:${e}`} className="text-text-main text-sm hover:underline hover:text-[#0369A1] dark:hover:text-cyan-300 transition-colors truncate">{e}</a>
                                            </div>
                                        )) : <p className="text-text-muted text-sm italic">None specified</p>}
                                    </div>
                                    {client.notes && (
                                        <div className="col-span-1 md:col-span-2">
                                            <p className="text-[#047857] dark:text-[#21D89A] text-[10px] font-black uppercase tracking-wider mb-1">NOTES</p>
                                            <p className="text-text-main text-sm whitespace-pre-line leading-relaxed bg-bg-card border border-border-card p-4 rounded-xl shadow-sm">{client.notes}</p>
                                        </div>
                                    )}
                                    {client.files?.length > 0 && (
                                        <div className="col-span-1 md:col-span-2">
                                            <p className="text-[#047857] dark:text-[#21D89A] text-[10px] font-black uppercase tracking-wider mb-2 flex items-center gap-1"><FileArchive size={12} /> ATTACHMENTS ({client.files.length})</p>
                                            <div className="flex flex-wrap gap-2">
                                                {client.files.map((f) => (
                                                    <a key={f.id} href={f.url} target="_blank" rel="noopener noreferrer"
                                                        className="text-xs text-[#047857] dark:text-[#21D89A] hover:brightness-95 bg-[#DDFBF0] dark:bg-[#21D89A]/10 px-3 py-1.5 rounded-lg border border-[#B7F3DD] dark:border-[#21D89A]/20 transition-all truncate max-w-[200px] font-bold flex items-center gap-1 shadow-sm">
                                                        <FileArchive size={12} /> {f.name}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <Modal isOpen={showForm} onClose={() => { setEditClient(undefined); setShowForm(false); }} title={editClient ? 'Edit Client' : 'Add Client'} size="lg">
                <ClientForm onClose={() => { setEditClient(undefined); setShowForm(false); }} editClient={editClient} />
            </Modal>

            <ClientDetailsModal
                isOpen={!!selectedClientId}
                onClose={() => setSelectedClientId(null)}
                clientId={selectedClientId}
            />
        </div>
    );
};
