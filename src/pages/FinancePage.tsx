import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useAppStore } from '../store';
import { format, addMonths, setDate as setDateFns } from 'date-fns';
import {
    Plus, TrendingUp, TrendingDown, Wallet,
    Loader2, Trash2, ChevronDown, ChevronUp, CalendarDays,
    ArrowRightLeft, Landmark, CreditCard, PieChart, Minus
} from 'lucide-react';
import { createDoc, deleteDocById, getDocById, updateDocById } from '../firebase/firestore';
import { formatCurrency, convertCurrency } from '../utils/currencyService';
import { generateInvoicePDF } from '../utils/pdfGenerator';
import { uploadFile } from '../firebase/storage';
import { EmailPreviewModal } from '../components/ui/EmailPreviewModal';
import { triggerN8n } from '../utils/n8nBridge';
import toast from 'react-hot-toast';
import type { FinanceEntry, CurrencyCode, FinanceType, Invoice, InvoiceItem, UserProfile } from '../types';
import { FileText, Download, User, Briefcase, Sparkles, Mail } from 'lucide-react';

// ─── Constants ───────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Food', 'Transport', 'Shopping', 'Health', 'Entertainment', 'Bills', 'Other'];
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'];
const CURRENCIES: CurrencyCode[] = ['BDT', 'USD', 'EUR'];

// ─── Helper: toDate ───────────────────────────────────────────────────────────
const toDate = (v: any): Date => {
    if (!v) return new Date();
    if (v instanceof Date) return v;
    if (typeof v?.toDate === 'function') return v.toDate();
    return new Date(v);
};

// ─── Entry Row Component ──────────────────────────────────────────────────────
const EntryRow: React.FC<{ entry: FinanceEntry; onDelete: (id: string) => void }> = ({ entry, onDelete }) => (
    <motion.div
        layout
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-bg-card border border-border-card shadow-sm group"
    >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            entry.type === 'earned' ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-450' : 'bg-rose-500/15 text-rose-500 dark:text-rose-450'
        }`}>
            {entry.type === 'earned' ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-text-main text-sm font-semibold truncate">{entry.description}</p>
            <p className="text-text-muted text-[10px] uppercase font-bold">{entry.category}</p>
        </div>
        <p className={`font-black text-sm tabular-nums ${entry.type === 'earned' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
            {entry.type === 'earned' ? '+' : '-'}{formatCurrency(entry.amount, entry.currency || 'EUR')}
        </p>
        <button
            onClick={() => onDelete(entry.id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
            title="Delete"
        >
            <Trash2 size={13} />
        </button>
    </motion.div>
);

// ─── Month Summary Card (History Tab) ──────────────────────────────────────────
const MonthCard: React.FC<{ month: string; entries: FinanceEntry[]; displayCurrency: CurrencyCode; rates: Record<string, number> | null }> = ({ month, entries, displayCurrency, rates }) => {
    const [open, setOpen] = useState(false);

    const totals = useMemo(() => {
        let earned = 0;
        let spent = 0;
        
        entries.forEach(e => {
            const amtInDisplay = rates ? convertCurrency(e.amount, e.currency || 'EUR', displayCurrency, rates) : e.amount;
            if (e.type === 'earned') earned += amtInDisplay;
            else spent += amtInDisplay;
        });

        return { earned, spent, net: earned - spent };
    }, [entries, displayCurrency, rates]);

    return (
        <div className="bg-bg-card border border-border-card rounded-2xl overflow-hidden shadow-sm">
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-bg-input transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-[#21D89A]/15 text-[#21D89A]">
                        <CalendarDays size={16} />
                    </div>
                    <div className="text-left">
                        <p className="text-text-main font-bold text-sm">{month}</p>
                        <p className="text-text-muted text-xs">{entries.length} entries</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                        <p className="text-emerald-500 dark:text-emerald-400 text-[10px] font-bold">+{formatCurrency(totals.earned, displayCurrency)}</p>
                        <p className="text-rose-500 dark:text-rose-400 text-[10px] font-bold">-{formatCurrency(totals.spent, displayCurrency)}</p>
                    </div>
                    <p className={`font-black text-sm tabular-nums ${totals.net >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                        {totals.net >= 0 ? '+' : '-'}{formatCurrency(totals.net, displayCurrency)}
                    </p>
                    {open ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
                </div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-bg-app border-t border-border-card"
                    >
                        <div className="p-4 space-y-2">
                            {entries.map(e => (
                                <div key={e.id} className="group flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-1.5 h-1.5 rounded-full ${e.type === 'earned' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                        <span className="text-text-main font-semibold">{e.description}</span>
                                        <span className="text-text-muted font-medium tracking-tight">({formatCurrency(e.amount, e.currency || 'EUR')})</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`font-bold tabular-nums ${e.type === 'earned' ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                            {rates ? formatCurrency(convertCurrency(e.amount, e.currency || 'EUR', displayCurrency, rates), displayCurrency) : formatCurrency(e.amount, e.currency || 'EUR')}
                                        </span>
                                        <button 
                                            onClick={(ev) => { ev.stopPropagation(); deleteDocById('finance_entries', e.id); }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-600 hover:text-rose-400 transition-all"
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const InvoiceDetailsModal: React.FC<{ invoice: Invoice; profile: Partial<UserProfile>; onClose: () => void; onSendInvoice: (invoice: Invoice) => void }> = ({ invoice, profile, onClose, onSendInvoice }) => {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }} 
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" 
            />
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-2xl bg-bg-card border border-border-card rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#21D89A] via-[#047857] to-[#21D89A]" />
                
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-10">
                        <div>
                            <h2 className="text-3xl font-black text-text-main tracking-tighter mb-1">INVOICE</h2>
                            <p className="text-text-muted text-[10px] font-black uppercase tracking-widest">{invoice.invoice_number}</p>
                        </div>
                        <button onClick={onClose} className="p-2 bg-bg-input hover:bg-border-card text-text-muted rounded-full transition-colors">
                            <Minus size={20} className="rotate-45" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Sender</p>
                                <p className="text-sm font-bold text-text-main">{profile.companyName || 'TaskMaster'}</p>
                                <p className="text-[10px] text-text-muted">{profile.fullName || profile.displayName}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Recipient</p>
                                <p className="text-sm font-bold text-text-main">{invoice.recipient_name}</p>
                                <p className="text-[10px] text-text-muted capitalize">{invoice.type.replace('_', ' ')}</p>
                            </div>
                        </div>
                        <div className="text-right space-y-4">
                            <div>
                                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Date Issued</p>
                                <p className="text-sm font-bold text-text-main">{format(new Date(invoice.date), 'dd MMMM yyyy')}</p>
                            </div>
                            {invoice.due_date && (
                                <div>
                                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Due Date</p>
                                    <p className="text-sm font-bold text-rose-500 dark:text-rose-400">{format(new Date(invoice.due_date), 'dd MMMM yyyy')}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-bg-app rounded-3xl border border-border-card overflow-hidden mb-8 shadow-sm">
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-border-card bg-bg-input">
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest">Description</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-center">Qty</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-text-muted uppercase tracking-widest text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoice.items.map((item, i) => (
                                    <tr key={i} className="border-b border-border-card/40 last:border-0">
                                        <td className="px-6 py-4 font-bold text-text-main">{item.description}</td>
                                        <td className="px-6 py-4 text-center font-mono text-text-muted">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right font-black text-text-main tabular-nums">
                                            {formatCurrency(item.price * item.quantity, invoice.currency)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {invoice.note && (
                        <div className="mb-8 p-6 bg-bg-app rounded-3xl border border-border-card shadow-sm">
                            <p className="text-[10px] font-black text-[#047857] dark:text-[#21D89A] uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Sparkles size={12} className="text-[#21D89A]" /> AI Generated Note
                            </p>
                            <p className="text-sm text-text-main leading-relaxed whitespace-pre-wrap">{invoice.note}</p>
                        </div>
                    )}

                    <div className="flex flex-col items-end gap-2 mb-10">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Total Amount due</p>
                        <p className="text-4xl font-black text-[#047857] dark:text-[#21D89A] tabular-nums tracking-tighter">
                            {formatCurrency(invoice.total_amount, invoice.currency)}
                        </p>
                    </div>

                    {profile.signatureURL && (
                        <div className="pt-8 border-t border-border-card">
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4">Authorized Signature</p>
                            <img src={profile.signatureURL} alt="Signature" className="h-16 w-auto opacity-90 dark:invert" />
                            <div className="w-48 h-px bg-border-card mt-2" />
                            <p className="text-[10px] font-bold text-text-muted mt-2">{profile.fullName || profile.displayName}</p>
                        </div>
                    )}
                </div>

                <div className="p-8 bg-bg-app border-t border-border-card flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={() => generateInvoicePDF(invoice, profile)}
                        className="flex-1 flex items-center justify-center gap-2 bg-bg-input hover:bg-border-card text-text-main font-black py-3.5 rounded-2xl transition-all border border-border-card cursor-pointer"
                    >
                        <Download size={16} /> DOWNLOAD PDF
                    </button>
                    <button 
                        onClick={() => onSendInvoice(invoice)}
                        className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#21D89A] to-[#047857] hover:opacity-95 text-black font-black py-3.5 rounded-2xl transition-all shadow-xl shadow-[#21D89A]/15 cursor-pointer active:scale-95"
                    >
                        <Mail size={16} /> SEND INVOICE
                    </button>
                    <button onClick={onClose} className="sm:w-28 bg-bg-input hover:bg-border-card text-text-muted hover:text-text-main font-black py-3.5 rounded-2xl transition-all cursor-pointer">
                        CLOSE
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const CreateInvoiceTab: React.FC<{ profile: Partial<UserProfile> }> = ({ profile }) => {
    const { clients, tasks, projects } = useAppStore();
    const [isSaving, setIsSaving] = useState(false);

    // Form State
    const [type, setType] = useState<'client_bill' | 'team_payout'>('client_bill');
    const [recipientId, setRecipientId] = useState('');
    const [recipientName, setRecipientName] = useState('');
    const [currency, setCurrency] = useState<CurrencyCode>('BDT');
    const [items, setItems] = useState<InvoiceItem[]>([{ description: '', quantity: 1, price: 0 }]);
    const [dueDate, setDueDate] = useState('');
    const [linkedProjectId, setLinkedProjectId] = useState('');
    const [linkedTaskIds, setLinkedTaskIds] = useState<string[]>([]);
    const [note, setNote] = useState('');

    const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const handleAddItem = () => setItems([...items, { description: '', quantity: 1, price: 0 }]);
    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));
    const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const handleGenerateNote = () => {
        if (!recipientName) {
            toast.error('Please select a recipient first');
            return;
        }

        let aiNote = `Invoice for services rendered to ${recipientName}.`;
        
        const proj = projects.find(p => p.id === linkedProjectId);
        if (proj) {
            aiNote += `\n\nProject: ${proj.name}`;
        }

        if (linkedTaskIds.length > 0) {
            aiNote += `\n\nCompleted Details:`;
            linkedTaskIds.forEach(tId => {
                const t = tasks.find(ta => ta.id === tId);
                if (t) aiNote += `\n- ${t.title}`;
            });
        }
        
        aiNote += `\n\nThank you for your business!\nBest regards,\n${profile.fullName || profile.displayName || 'TaskMaster'}`;

        setNote(aiNote);
        toast.success('AI Note Generated!');
    };

    const toggleTask = (taskId: string) => {
        setLinkedTaskIds(prev => 
            prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!recipientName.trim() || items.some(i => !i.description.trim())) {
            toast.error('Please fill required fields');
            return;
        }

        setIsSaving(true);
        try {
            const invoiceNum = `INV-${Date.now().toString().slice(-6)}`;
            const newInvoice: Partial<Invoice> = {
                invoice_number: invoiceNum,
                date: format(new Date(), 'yyyy-MM-dd'),
                due_date: dueDate || undefined,
                type,
                sender_id: profile.uid || '',
                recipient_id: recipientId,
                recipient_name: recipientName,
                items,
                currency,
                status: 'sent',
                linked_project_id: linkedProjectId || undefined,
                linked_task_ids: linkedTaskIds,
                note: note || undefined,
                owner_id: profile.uid || '',
                total_amount: subtotal,
                created_at: new Date()
            };

            await createDoc('invoices', newInvoice);
            toast.success('Invoice created');
            setItems([{ description: '', quantity: 1, price: 0 }]);
            setRecipientId('');
            setRecipientName('');
            setLinkedProjectId('');
            setLinkedTaskIds([]);
            setNote('');
        } catch (err) {
            toast.error('Failed to create invoice');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest pl-1">Create New Invoice</h3>
            </div>

            <form onSubmit={handleSubmit} className="bg-bg-card border border-border-card rounded-3xl p-6 space-y-5 relative shadow-sm">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#21D89A] to-[#047857]" />
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Invoice Type</label>
                                    <div className="flex bg-bg-input p-1 rounded-xl border border-border-input">
                                        <button
                                            type="button"
                                            onClick={() => setType('client_bill')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${type === 'client_bill' ? 'bg-[#DDFBF0] text-[#047857]' : 'text-text-muted hover:text-text-main'}`}
                                        >
                                            <Briefcase size={12} /> Client Bill
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setType('team_payout')}
                                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase transition-all cursor-pointer ${type === 'team_payout' ? 'bg-[#DDFBF0] text-[#047857]' : 'text-text-muted hover:text-text-main'}`}
                                        >
                                            <User size={12} /> Team Payout
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Recipient</label>
                                    {type === 'client_bill' ? (
                                        <select
                                            value={recipientId}
                                            onChange={(e) => {
                                                const c = clients.find(cl => cl.id === e.target.value);
                                                setRecipientId(e.target.value);
                                                setRecipientName(c ? c.name : '');
                                            }}
                                            className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                        >
                                            <option value="">Select Client</option>
                                            {clients.map(c => <option key={c.id} value={c.id} className="bg-bg-card">{c.name} ({c.company})</option>)}
                                        </select>
                                    ) : (
                                        <input
                                            required
                                            value={recipientName}
                                            onChange={e => setRecipientName(e.target.value)}
                                            placeholder="Recipient Name"
                                            className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                        />
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Currency</label>
                                    <select
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                        className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                    >
                                        {CURRENCIES.map(c => <option key={c} value={c} className="bg-bg-card">{c}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Project (Optional)</label>
                                    <select
                                        value={linkedProjectId}
                                        onChange={e => {
                                            setLinkedProjectId(e.target.value);
                                            setLinkedTaskIds([]); // Reset tasks when project changes
                                        }}
                                        className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                    >
                                        <option value="">Select Project</option>
                                        {projects.map(p => <option key={p.id} value={p.id} className="bg-bg-card">{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Due Date (Optional)</label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={e => setDueDate(e.target.value)}
                                        className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Linked Tasks (Optional)</label>
                                <div className="bg-bg-app border border-border-card rounded-xl p-3 max-h-32 overflow-y-auto custom-scrollbar flex flex-col gap-2 shadow-inner">
                                    {tasks.filter(t => t.status !== 'done' && (!linkedProjectId || t.project_id === linkedProjectId)).length === 0 ? (
                                        <p className="text-xs text-text-muted italic px-2 py-1">No pending tasks found.</p>
                                    ) : (
                                        tasks.filter(t => t.status !== 'done' && (!linkedProjectId || t.project_id === linkedProjectId)).map(t => (
                                            <label key={t.id} className="flex items-center gap-3 p-2 hover:bg-bg-input rounded-lg cursor-pointer transition-colors border border-transparent hover:border-border-card">
                                                <input 
                                                    type="checkbox" 
                                                    checked={linkedTaskIds.includes(t.id)}
                                                    onChange={() => toggleTask(t.id)}
                                                    className="w-4 h-4 rounded border-border-input text-[#21D89A] focus:ring-[#21D89A]/30 bg-bg-input"
                                                />
                                                <span className="text-sm text-text-main truncate font-medium">{t.title}</span>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2 relative">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Invoice Note</label>
                                    <button
                                        type="button"
                                        onClick={handleGenerateNote}
                                        className="text-[10px] font-black text-[#047857] dark:text-[#21D89A] hover:text-[#047857]/80 dark:hover:text-[#21D89A]/80 transition-colors flex items-center gap-1 uppercase tracking-widest cursor-pointer"
                                    >
                                        <Sparkles size={12} /> Auto-Generate
                                    </button>
                                </div>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    placeholder="Thank you for your business..."
                                    rows={4}
                                    className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-[#21D89A] custom-scrollbar resize-none placeholder:text-text-muted/40 transition-colors"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Items</label>
                                {items.map((item, index) => (
                                    <div key={index} className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                                        <input
                                            required
                                            value={item.description}
                                            onChange={e => handleItemChange(index, 'description', e.target.value)}
                                            placeholder="Description"
                                            className="sm:col-span-3 bg-bg-input border border-border-input rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                        />
                                        <input
                                            required
                                            type="number"
                                            value={item.quantity}
                                            onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                                            className="bg-bg-input border border-border-input rounded-xl px-3 py-2 text-sm text-center font-mono text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                        />
                                        <input
                                            required
                                            type="number"
                                            value={item.price}
                                            onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value) || 0)}
                                            className="bg-bg-input border border-border-input rounded-xl px-3 py-2 text-sm text-center font-mono text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveItem(index)}
                                            disabled={items.length === 1}
                                            className="p-2 text-text-muted hover:text-rose-500 disabled:opacity-30 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="text-[10px] font-black text-[#21D89A] hover:text-[#21D89A]/80 transition-colors flex items-center gap-1 uppercase tracking-widest"
                                >
                                    <Plus size={12} /> Add Item
                                </button>
                            </div>

                            <div className="pt-4 border-t border-white/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-right sm:text-left">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Amount</p>
                                    <p className="text-2xl font-black text-[#21D89A] tabular-nums">{formatCurrency(subtotal, currency)}</p>
                                </div>
                                <button
                                    disabled={isSaving}
                                    className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-[#21D89A] to-[#047857] hover:opacity-90 text-black font-black rounded-2xl transition-all shadow-xl shadow-[#21D89A]/30 flex items-center justify-center gap-2"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : 'GENERATE INVOICE'}
                                </button>
                            </div>
            </form>
        </div>
    );
};

const InvoicesListTab: React.FC<{ profile: Partial<UserProfile>; onSendInvoice: (invoice: Invoice) => void }> = ({ profile, onSendInvoice }) => {
    const { invoices } = useAppStore();
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                {invoices.length === 0 ? (
                    <div className="bg-border-card border border-border-card/50 rounded-3xl p-12 text-center text-text-muted italic text-sm border-dashed">
                        No invoices generated yet.
                    </div>
                ) : (
                    invoices.map(inv => (
                        <div key={inv.id} className="bg-bg-card border border-border-card rounded-3xl p-5 flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 group hover:border-[#21D89A]/50 transition-all cursor-pointer shadow-sm" onClick={() => setSelectedInvoice(inv)}>
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${inv.type === 'client_bill' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500 dark:text-rose-450'}`}>
                                    <FileText size={20} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-text-main">{inv.invoice_number}</p>
                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${inv.type === 'client_bill' ? 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400' : 'bg-rose-500/15 text-rose-500 dark:text-rose-450'}`}>
                                            {inv.type === 'client_bill' ? 'Bill' : 'Payout'}
                                        </span>
                                    </div>
                                    <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight">{inv.recipient_name} • {format(new Date(inv.date), 'dd MMM yyyy')}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                <div className="text-right">
                                    <p className="text-text-main font-black tabular-nums">{formatCurrency(inv.total_amount, inv.currency)}</p>
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${inv.status === 'paid' ? 'text-emerald-500 dark:text-emerald-400' : 'text-amber-500 dark:text-amber-450'}`}>{inv.status}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onSendInvoice(inv); }}
                                        className={`p-2.5 bg-bg-input hover:bg-border-card border border-border-card text-[#047857] dark:text-[#21D89A] rounded-xl transition-all cursor-pointer ${inv.pdf_url ? 'bg-[#21D89A]/10 border-[#21D89A]/30' : ''}`}
                                        title="Send Invoice"
                                    >
                                        <Mail size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); generateInvoicePDF(inv, profile); }}
                                        className="p-2.5 bg-bg-input hover:bg-border-card border border-border-card text-text-main rounded-xl transition-all cursor-pointer"
                                        title="Download PDF"
                                    >
                                        <Download size={16} />
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); deleteDocById('invoices', inv.id); }} 
                                        className="opacity-0 group-hover:opacity-100 p-2.5 bg-bg-input hover:bg-rose-500/10 border border-border-card text-text-muted hover:text-rose-500 rounded-xl transition-all cursor-pointer"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <AnimatePresence>
                {selectedInvoice && (
                    <InvoiceDetailsModal 
                        invoice={selectedInvoice} 
                        profile={profile} 
                        onClose={() => setSelectedInvoice(null)} 
                        onSendInvoice={onSendInvoice}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
export interface FinancePageProps {
    viewMode?: 'dashboard' | 'history';
}

export const FinancePage: React.FC<FinancePageProps> = ({ viewMode = 'dashboard' }) => {
    const { user } = useAuth();
    const { exchangeRates, savings, emis, financeEntries: entries, invoices, clients } = useAppStore();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    const [activeTab, setActiveTab] = useState<'today' | 'invoices' | 'new_invoice' | 'history' | 'savings' | 'emis'>(viewMode === 'history' ? 'history' : 'today');
    const [displayCurrency, setDisplayCurrency] = useState<CurrencyCode>('BDT');
    const [userProfile, setUserProfile] = useState<Partial<UserProfile>>({});

    // Invoice Email Preview Modal States
    const [selectedEmailInvoice, setSelectedEmailInvoice] = useState<Invoice | null>(null);
    const [invoiceEmailPreviewOpen, setInvoiceEmailPreviewOpen] = useState(false);
    const [invoiceEmailPreviewData, setInvoiceEmailPreviewData] = useState({ to: '', subject: '', body: '' });
    const [invoicePdfLoading, setInvoicePdfLoading] = useState(false);

    // Load Profile for signature/company name
    useEffect(() => {
        if (user) {
            getDocById('users', user.uid).then(p => {
                if (p) setUserProfile(p as Partial<UserProfile>);
            });
        }
    }, [user]);

    const buildInvoiceEmailBody = (inv: Invoice, pdfUrl: string) => {
        return `Dear ${inv.recipient_name},

I hope you are doing well.

Please find the invoice ${inv.invoice_number} for services rendered.

Invoice Summary:
- Number: ${inv.invoice_number}
- Date Issued: ${inv.date}
- Due Date: ${inv.due_date || 'N/A'}
- Total Amount: ${formatCurrency(inv.total_amount, inv.currency)}

You can view and download your full invoice PDF here:
${pdfUrl}

Thank you for your business!

Best regards,
${userProfile.fullName || userProfile.displayName || 'Independent Contractor'}
${userProfile.companyName || ''}`;
    };

    const handleOpenInvoiceEmailPreview = async (inv: Invoice) => {
        setSelectedEmailInvoice(inv);
        setInvoiceEmailPreviewOpen(true);
        
        let recipientEmail = '';
        if (inv.type === 'client_bill') {
            const client = clients.find(c => c.id === inv.recipient_id);
            recipientEmail = client?.emails?.[0] || '';
        }
        
        const subject = `Invoice ${inv.invoice_number} from ${userProfile.companyName || 'PragmaOS'}`;
        
        if (inv.pdf_url) {
            const body = buildInvoiceEmailBody(inv, inv.pdf_url);
            setInvoiceEmailPreviewData({ to: recipientEmail, subject, body });
            return;
        }
        
        setInvoicePdfLoading(true);
        try {
            // Generate PDF doc (shouldDownload = false)
            const doc = await generateInvoicePDF(inv, userProfile, false);
            
            // Output as blob and upload to storage
            const pdfBlob = doc.output('blob');
            const pdfFile = new File([pdfBlob], `Invoice_${inv.invoice_number}.pdf`, { type: 'application/pdf' });
            
            const uploadResult = await uploadFile(pdfFile, 'invoices', inv.id);
            const hostedUrl = uploadResult.url;
            
            // Update Firestore record
            await updateDocById('invoices', inv.id, { pdf_url: hostedUrl });
            
            // Update email preview body
            const body = buildInvoiceEmailBody(inv, hostedUrl);
            setInvoiceEmailPreviewData({ to: recipientEmail, subject, body });
        } catch (err) {
            toast.error('Failed to generate or upload invoice PDF');
            console.error(err);
            setInvoiceEmailPreviewOpen(false);
        } finally {
            setInvoicePdfLoading(false);
        }
    };

    const handleTriggerInvoiceAutomation = async (data: { to: string; subject: string; body: string }) => {
        if (!selectedEmailInvoice) return;
        await triggerN8n('send_invoice_email', {
            invoice_id: selectedEmailInvoice.id,
            email: data.to,
            title: data.subject,
            body: data.body,
            pdf_url: selectedEmailInvoice.pdf_url || ''
        });
    };

    const handleInvoiceSentSuccess = async () => {
        if (!selectedEmailInvoice) return;
        try {
            await updateDocById('invoices', selectedEmailInvoice.id, { status: 'sent' });
        } catch (err) {
            console.error('Failed to update invoice status:', err);
        }
    };
    


    const handleClearAll = async () => {
        if (!window.confirm('Are you sure you want to clear ALL finance data? This includes transactions, invoices, savings, and EMIs.')) return;
        
        setIsSaving(true);
        try {
            const promises = [
                ...entries.map(e => deleteDocById('finance_entries', e.id)),
                ...invoices.map(i => deleteDocById('invoices', i.id)),
                ...savings.map(s => deleteDocById('savings', s.id)),
                ...emis.map(e => deleteDocById('emis', e.id))
            ];
            await Promise.all(promises);
            toast.success('All finance data cleared');
        } catch (err) {
            toast.error('Failed to clear some data');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClearToday = async () => {
        if (!window.confirm(`Clear all ${todayEntries.length} entr${todayEntries.length === 1 ? 'y' : 'ies'} from today?`)) return;
        try {
            await Promise.all(todayEntries.map(e => deleteDocById('finance_entries', e.id)));
            toast.success('Today\'s entries cleared');
        } catch {
            toast.error('Failed to clear today\'s entries');
        }
    };

    const handleClearHistory = async () => {
        if (!window.confirm('Delete ALL finance transaction history? This cannot be undone.')) return;
        try {
            await Promise.all(entries.map(e => deleteDocById('finance_entries', e.id)));
            toast.success('History cleared');
        } catch {
            toast.error('Failed to clear history');
        }
    };
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<FinanceType>('spent');
    const [category, setCategory] = useState('Food');
    const [entryCurrency, setEntryCurrency] = useState<CurrencyCode>('BDT');
    const [isSaving, setIsSaving] = useState(false);

    // Savings Form State
    const [savTitle, setSavTitle] = useState('');
    const [savAmount, setSavAmount] = useState('');
    const [savInstitution, setSavInstitution] = useState('');
    const [savType] = useState<'savings' | 'investment'>('savings');
    const [savCurrency, setSavCurrency] = useState<CurrencyCode>('BDT');

    // Subscription Form State
    const [emiTitle, setEmiTitle] = useState('');
    const [emiAmount, setEmiAmount] = useState('');
    const [emiBillingCycle, setEmiBillingCycle] = useState<'1_month' | '3_months' | '1_year'>('1_month');
    const [emiPaymentMethod, setEmiPaymentMethod] = useState('');
    const [emiNextDate, setEmiNextDate] = useState('');
    const [emiCurrency, setEmiCurrency] = useState<CurrencyCode>('BDT');

    // Real-time listener removed - now handled globally in App.tsx

    // Data Filtering & Calculations
    const todayEntries = useMemo(() => entries.filter(e => e.date === todayStr), [entries, todayStr]);

    const todayStats = useMemo(() => {
        let earned = 0;
        let spent = 0;
        todayEntries.forEach(e => {
            const amtConverted = exchangeRates ? convertCurrency(e.amount, e.currency || 'EUR', displayCurrency, exchangeRates) : e.amount;
            if (e.type === 'earned') earned += amtConverted;
            else spent += amtConverted;
        });
        return { earned, spent, net: earned - spent };
    }, [todayEntries, displayCurrency, exchangeRates]);

    const monthlyGroups = useMemo(() => {
        const groups: Record<string, FinanceEntry[]> = {};
        entries.forEach(e => {
            const date = toDate(e.created_at);
            const key = format(date, 'MMMM yyyy');
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        });
        return Object.entries(groups).sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime());
    }, [entries]);

    const savingsTotal = useMemo(() => {
        return savings.reduce((acc, s) => acc + (exchangeRates ? convertCurrency(s.amount, s.currency || 'EUR', displayCurrency, exchangeRates) : s.amount), 0);
    }, [savings, displayCurrency, exchangeRates]);

    const emiMonthlyTotal = useMemo(() => {
        return emis.reduce((acc, e) => {
            let equivalentMonthly = 0;
            const rawAmount = e.amount || e.monthly_amount || 0;
            if (e.billing_cycle === '3_months') equivalentMonthly = rawAmount / 3;
            else if (e.billing_cycle === '1_year') equivalentMonthly = rawAmount / 12;
            else equivalentMonthly = rawAmount;

            return acc + (exchangeRates ? convertCurrency(equivalentMonthly, e.currency || 'EUR', displayCurrency, exchangeRates) : equivalentMonthly);
        }, 0);
    }, [emis, displayCurrency, exchangeRates]);

    // Monthly Calculation for Breakdown
    const monthlyStats = useMemo(() => {
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        const monthEntries = entries.filter(e => {
            const date = toDate(e.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });

        let earned = 0;
        let spent = 0;
        const dailyMap: Record<string, { earned: number, spent: number }> = {};

        monthEntries.forEach(e => {
            const dateKey = format(toDate(e.created_at), 'yyyy-MM-dd');
            const amtConverted = exchangeRates ? convertCurrency(e.amount, e.currency || 'EUR', displayCurrency, exchangeRates) : e.amount;
            
            if (!dailyMap[dateKey]) dailyMap[dateKey] = { earned: 0, spent: 0 };
            
            if (e.type === 'earned') {
                earned += amtConverted;
                dailyMap[dateKey].earned += amtConverted;
            } else {
                spent += amtConverted;
                dailyMap[dateKey].spent += amtConverted;
            }
        });

        const dailyBreakdown = Object.entries(dailyMap)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, vals]) => ({ date, ...vals }));

        return { earned, spent, dailyBreakdown };
    }, [entries, displayCurrency, exchangeRates]);

    // Handlers
    const handleAddEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        const amtVal = parseFloat(amount);
        if (!user || !description.trim() || isNaN(amtVal)) return;

        setIsSaving(true);
        try {
            await createDoc('finance_entries', {
                date: todayStr,
                description: description.trim(),
                amount: amtVal,
                currency: entryCurrency,
                type,
                category,
                owner_id: user.uid,
            });
            setDescription(''); setAmount('');
            toast.success('Entry added');
        } catch { toast.error('Failed to add entry'); }
        finally { setIsSaving(false); }
    };

    const handleAddSaving = async (e: React.FormEvent) => {
        e.preventDefault();
        const amtVal = parseFloat(savAmount);
        if (!user || !savTitle.trim() || isNaN(amtVal)) return;

        setIsSaving(true);
        try {
            await createDoc('savings', {
                title: savTitle.trim(),
                amount: amtVal,
                currency: savCurrency,
                institution: savInstitution.trim(),
                type: savType,
                date: todayStr,
                owner_id: user.uid,
            });
            setSavTitle(''); setSavAmount(''); setSavInstitution('');
            toast.success('Saving added');
        } catch { toast.error('Failed to add saving'); }
        finally { setIsSaving(false); }
    };

    const handleAddEMI = async (e: React.FormEvent) => {
        e.preventDefault();
        const amt = parseFloat(emiAmount);
        if (!user || !emiTitle.trim() || isNaN(amt) || !emiNextDate) return;

        setIsSaving(true);
        try {
            await createDoc('emis', {
                title: emiTitle.trim(),
                amount: amt,
                currency: emiCurrency,
                billing_cycle: emiBillingCycle,
                payment_method: emiPaymentMethod.trim(),
                next_billing_date: emiNextDate,
                start_date: todayStr,
                owner_id: user.uid,
            });
            setEmiTitle(''); setEmiAmount(''); setEmiPaymentMethod(''); setEmiNextDate('');
            toast.success('Subscription added');
        } catch { toast.error('Failed to add Subscription'); }
        finally { setIsSaving(false); }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4">
            {/* Header with Currency Selector */}
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 py-4">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#DDFBF0] border border-[#B7F3DD] flex items-center justify-center shadow-sm">
                        <Wallet size={24} className="text-[#047857]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-text-main tracking-tight">Finance</h1>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                            <Landmark size={12} className="text-[#047857]" /> Smart Management System
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 p-1 bg-[#F3F7F5] rounded-xl border border-border-input">
                    {CURRENCIES.map(c => (
                        <button
                            key={c}
                            onClick={() => setDisplayCurrency(c)}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest transition-all cursor-pointer ${
                                displayCurrency === c
                                    ? 'bg-[#DDFBF0] text-[#047857] border border-[#B7F3DD]/40'
                                    : 'text-text-muted hover:text-text-main'
                            }`}
                        >
                            {c}
                        </button>
                    ))}
                    <div className="w-px h-4 bg-border-input mx-1" />
                    <button className="p-1.5 text-text-muted hover:text-[#047857] cursor-pointer" title="Daily Exchange Rates">
                        <ArrowRightLeft size={14} />
                    </button>
                    <button 
                        onClick={handleClearAll}
                        className="p-1.5 text-text-muted hover:text-[#BE123C] transition-colors cursor-pointer" 
                        title="Clear All Finance Data"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </header>

            {/* Main Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {(viewMode === 'history' 
                    ? (['history', 'invoices'] as const)
                    : (['today', 'new_invoice', 'savings', 'emis'] as const)
                ).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border cursor-pointer ${
                            activeTab === tab
                                ? 'bg-[#DDFBF0] text-[#047857] border-[#B7F3DD]'
                                : 'bg-[#F3F7F5] text-[#6B7C73] border-transparent hover:bg-bg-card hover:text-text-main'
                        }`}
                    >
                        {tab === 'emis' ? 'Subscriptions' : tab === 'new_invoice' ? 'New Invoice' : tab}
                    </button>
                ))}
            </div>

            {/* Content Tabs */}
            <div className="space-y-6">
                <AnimatePresence mode="wait">
                    {activeTab === 'today' && (
                        <motion.div
                            key="today"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-6"
                        >
                        {/* Stats Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {[
                                { title: 'Earned', amount: todayStats.earned, color: 'emerald', icon: TrendingUp },
                                { title: 'Spent', amount: todayStats.spent, color: 'red', icon: TrendingDown },
                                { title: 'Net Change', amount: todayStats.net, color: todayStats.net >= 0 ? 'emerald' : 'red', icon: Wallet }
                            ].map((card, i) => (
                                <div key={i} className="bg-white dark:bg-bg-card border border-border-card rounded-[18px] p-5 relative overflow-hidden shadow-sm">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider">{card.title}</p>
                                        <div className={`p-2 rounded-lg ${
                                            card.color === 'emerald' ? 'bg-[#DDFBF0] text-[#047857]' : 'bg-[#FFE4E8] text-[#BE123C]'
                                        }`}>
                                            <card.icon size={14} />
                                        </div>
                                    </div>
                                    <p className={`text-2xl font-black tabular-nums tracking-tight font-display ${
                                        card.color === 'emerald' ? 'text-[#047857]' : 'text-[#BE123C]'
                                    }`}>
                                        {card.amount >= 0 ? '+' : '-'}{formatCurrency(Math.abs(card.amount), displayCurrency)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Add Form */}
                        <div className="bg-white dark:bg-bg-card border border-border-card rounded-[22px] p-6 relative overflow-hidden shadow-sm">
                            <div className="absolute top-0 left-0 w-full h-1 bg-[#21D89A]" />
                            <form onSubmit={handleAddEntry} className="space-y-5">
                                <div className="flex items-center justify-between">
                                    <label className="text-text-main text-xs font-bold uppercase tracking-widest">Add Daily Record</label>
                                    <div className="flex bg-[#F3F7F5] dark:bg-bg-input p-1 rounded-xl border border-border-input">
                                        {(['spent', 'earned'] as const).map(t => (
                                            <button
                                                key={t}
                                                type="button"
                                                onClick={() => setType(t)}
                                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                                                    type === t ? 'bg-[#DDFBF0] text-[#047857]' : 'text-text-muted hover:text-text-main'
                                                }`}
                                            >
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                                    <div className="sm:col-span-2">
                                        <input
                                            required
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="What for?"
                                            className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-3 text-sm focus:border-glitch-emerald focus:ring-4 focus:ring-glitch-emerald/5 outline-none transition-all placeholder:text-text-muted/65 text-text-main font-semibold"
                                        />
                                    </div>
                                    <div className="relative group">
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1 items-center bg-bg-input px-2 py-1 rounded-lg border border-border-input group-focus-within:border-glitch-emerald/40 transition-all">
                                            <select 
                                                value={entryCurrency} 
                                                onChange={e => setEntryCurrency(e.target.value as CurrencyCode)}
                                                className="bg-transparent border-none outline-none text-[10px] font-bold text-[#047857] cursor-pointer appearance-none"
                                            >
                                                {CURRENCIES.map(c => <option key={c} value={c} className="bg-bg-card">{c}</option>)}
                                            </select>
                                        </div>
                                        <input
                                            required
                                            type="number"
                                            step="0.01"
                                            value={amount}
                                            onChange={e => setAmount(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-bg-input border border-border-input rounded-xl pl-4 pr-16 py-3 text-sm font-mono focus:border-glitch-emerald focus:ring-4 focus:ring-glitch-emerald/5 outline-none transition-all text-text-main"
                                        />
                                    </div>
                                    <select
                                        value={category}
                                        onChange={e => setCategory(e.target.value)}
                                        className="bg-bg-input border border-border-input rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-glitch-emerald focus:ring-4 focus:ring-glitch-emerald/5"
                                    >
                                        {(type === 'spent' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES).map(c => (
                                            <option key={c} value={c}>{c}</option>
                                        ))}
                                    </select>
                                </div>
                                <button
                                    disabled={isSaving}
                                    className="w-full py-4 bg-glitch-emerald text-[#053B2A] font-bold rounded-xl transition-all shadow-[0_8px_20px_rgba(33,216,154,0.15)] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                                    CONFIRM TRANSACTION
                                </button>
                            </form>
                        </div>

                        {/* List & Monthly Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-3">
                                <div className="flex items-center justify-between pl-1">
                                    <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest">Today's Transactions</h3>
                                    {todayEntries.length > 0 && (
                                        <button
                                            onClick={handleClearToday}
                                            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
                                        >
                                            <Trash2 size={11} /> Clear Today
                                        </button>
                                    )}
                                </div>
                                {todayEntries.length === 0 ? (
                                    <div className="bg-white/[0.02] border-2 border-dashed border-white/[0.08] rounded-3xl p-12 text-center text-slate-600 italic text-sm">
                                        No entries recorded for today.
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <AnimatePresence mode="popLayout">
                                            {todayEntries.map(e => <EntryRow key={e.id} entry={e} onDelete={(id) => deleteDocById('finance_entries', id)} />)}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="bg-white/[0.02] border border-white/[0.08] rounded-3xl p-5 space-y-4">
                                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-white/[0.08] pb-2">
                                        {format(today, 'MMMM')} Summary
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Income</p>
                                            <p className="text-lg font-black text-emerald-400 tabular-nums">{formatCurrency(monthlyStats.earned, displayCurrency)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase">Spending</p>
                                            <p className="text-lg font-black text-rose-400 tabular-nums">{formatCurrency(monthlyStats.spent, displayCurrency)}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 pt-2">
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Daily Breakdown</p>
                                        <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                            {monthlyStats.dailyBreakdown.map(day => (
                                                <div key={day.date} className="flex items-center justify-between p-2 rounded-xl bg-black/20 border border-white/5">
                                                    <span className="text-[10px] font-bold text-slate-400">{format(new Date(day.date), 'dd MMM')}</span>
                                                    <div className="flex gap-3">
                                                        {day.earned > 0 && <span className="text-[10px] font-black text-emerald-400 tabular-nums">+{formatCurrency(day.earned, displayCurrency)}</span>}
                                                        {day.spent > 0 && <span className="text-[10px] font-black text-rose-400 tabular-nums">-{formatCurrency(day.spent, displayCurrency)}</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {monthlyStats.dailyBreakdown.length === 0 && (
                                                <p className="text-center text-[10px] text-slate-600 py-4 italic">No activity this month</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'invoices' && (
                    <motion.div key="invoices" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <InvoicesListTab profile={userProfile} onSendInvoice={handleOpenInvoiceEmailPreview} />
                    </motion.div>
                )}

                {activeTab === 'new_invoice' && (
                    <motion.div key="new_invoice" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                        <CreateInvoiceTab profile={userProfile} />
                    </motion.div>
                )}

                {activeTab === 'savings' && (
                    <motion.div key="savings" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden">
                            <div className="flex justify-between items-center mb-4">
                                <Landmark className="text-emerald-400" size={32} />
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60">Total Savings & Assets</p>
                                    <p className="text-3xl font-black text-emerald-400 tabular-nums">{formatCurrency(savingsTotal, displayCurrency)}</p>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/10 blur-[80px] rounded-full" />
                        </div>

                        <form onSubmit={handleAddSaving} className="grid grid-cols-1 sm:grid-cols-5 gap-3 bg-bg-card p-4 rounded-3xl border border-border-card shadow-sm">
                            <input required value={savTitle} onChange={e => setSavTitle(e.target.value)} placeholder="Asset Name" className="sm:col-span-2 bg-bg-input border border-border-input rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-emerald-500/40" />
                            <input required type="number" step="0.01" value={savAmount} onChange={e => setSavAmount(e.target.value)} placeholder="Value" className="bg-bg-input border border-border-input rounded-xl px-4 py-2 text-sm font-mono text-text-main outline-none focus:border-emerald-500/40" />
                            <select value={savCurrency} onChange={e => setSavCurrency(e.target.value as CurrencyCode)} className="bg-bg-input border border-border-input rounded-xl px-4 py-2 text-[10px] font-black uppercase text-text-muted outline-none">
                                {CURRENCIES.map(c => <option key={c} value={c} className="bg-bg-card">{c}</option>)}
                            </select>
                            <button className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/10 cursor-pointer">ADD ASSET</button>
                        </form>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {savings.map(s => (
                                <div key={s.id} className="bg-bg-card border border-border-card rounded-2xl p-4 flex justify-between items-center group shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-bg-input text-[#21D89A]">
                                            {s.type === 'savings' ? <Landmark size={16} /> : <PieChart size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-text-main">{s.title}</p>
                                            <p className="text-[10px] text-text-muted uppercase tracking-widest">{s.institution || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <p className="text-[#047857] dark:text-emerald-450 font-bold tabular-nums text-sm">{formatCurrency(s.amount, s.currency || 'EUR')}</p>
                                        <button onClick={() => deleteDocById('savings', s.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-rose-500 p-1 cursor-pointer"><Trash2 size={13} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'emis' && (
                    <motion.div key="emis" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                        <div className="bg-gradient-to-br from-white to-[#F0FFF8] dark:from-bg-card dark:to-bg-input border border-border-card rounded-[22px] p-6 relative overflow-hidden shadow-sm">
                            <div className="flex justify-between items-center mb-4 relative z-10">
                                <CreditCard className="text-[#047857] dark:text-glitch-emerald" size={32} />
                                <div className="text-right">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Equivalent Monthly Load</p>
                                    <p className="text-3xl font-black text-[#047857] dark:text-glitch-emerald tabular-nums">{formatCurrency(emiMonthlyTotal, displayCurrency)}</p>
                                </div>
                            </div>
                            <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#21D89A]/5 blur-[80px] rounded-full" />
                        </div>

                        <form onSubmit={handleAddEMI} className="space-y-4 bg-white dark:bg-bg-card p-5 sm:p-6 rounded-[22px] border border-border-card shadow-sm">
                            <p className="text-[#047857] dark:text-glitch-emerald text-[10px] font-black uppercase tracking-tighter mb-2">New Subscription</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <input required value={emiTitle} onChange={e => setEmiTitle(e.target.value)} placeholder="Service Title (e.g., Netflix)" className="lg:col-span-2 bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-glitch-emerald/50" />
                                <div className="flex gap-2 w-full lg:col-span-2">
                                    <input required type="number" step="0.01" value={emiAmount} onChange={e => setEmiAmount(e.target.value)} placeholder="Amount" className="flex-1 min-w-[100px] bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm font-mono text-text-main outline-none focus:border-glitch-emerald/50" />
                                    <select value={emiCurrency} onChange={e => setEmiCurrency(e.target.value as CurrencyCode)} className="bg-bg-input border border-border-input rounded-xl px-3 py-2 text-[10px] font-black uppercase text-text-muted outline-none w-20 flex-shrink-0">
                                        {CURRENCIES.map(c => <option key={c} value={c} className="bg-bg-card">{c}</option>)}
                                    </select>
                                </div>
                                <select value={emiBillingCycle} onChange={e => setEmiBillingCycle(e.target.value as any)} className="bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-glitch-emerald/50">
                                    <option value="1_month" className="bg-bg-card">Monthly (1 Month)</option>
                                    <option value="3_months" className="bg-bg-card">Quarterly (3 Months)</option>
                                    <option value="1_year" className="bg-bg-card">Yearly (1 Year)</option>
                                </select>
                                <div className="relative">
                                    <input list="payment-methods" required value={emiPaymentMethod} onChange={e => setEmiPaymentMethod(e.target.value)} placeholder="Payment Method" className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-glitch-emerald/50" />
                                    <datalist id="payment-methods">
                                        {Array.from(new Set(emis.map(e => e.payment_method).filter(Boolean))).map(pm => (
                                            <option key={pm} value={pm} />
                                        ))}
                                    </datalist>
                                </div>
                                <div className="lg:col-span-2 flex flex-col justify-center">
                                    <label className="text-[10px] font-bold uppercase text-text-muted mb-1">First Deadline / Next Billing Date</label>
                                    <input required type="date" value={emiNextDate} onChange={e => setEmiNextDate(e.target.value)} className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2 text-sm text-text-main outline-none focus:border-glitch-emerald/50" />
                                </div>
                            </div>
                            <button className="w-full bg-glitch-emerald text-[#053B2A] font-bold py-3 rounded-xl text-xs transition-all shadow-[0_4px_12px_rgba(33,216,154,0.15)] uppercase tracking-widest mt-2 cursor-pointer">Add Subscription</button>
                        </form>

                        <div className="space-y-3">
                            {emis.map(e => {
                                const rawAmt = e.amount || e.monthly_amount || 0;
                                const nextDateStr = e.next_billing_date 
                                    ? format(new Date(e.next_billing_date), 'dd MMM yyyy') 
                                    : (e.due_day ? format(setDateFns(addMonths(new Date(), 1), e.due_day), 'dd MMM yyyy') : 'Unknown');
                                const cycleLabel = e.billing_cycle === '3_months' ? 'Quarterly' : e.billing_cycle === '1_year' ? 'Yearly' : 'Monthly';

                                return (
                                <div key={e.id} className="bg-bg-card border border-border-card rounded-3xl p-5 flex flex-wrap sm:flex-nowrap justify-between items-center gap-4 group shadow-sm">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-[#21D89A]/10 flex flex-col items-center justify-center border border-[#21D89A]/20 text-[#21D89A]">
                                            <CalendarDays size={20} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-text-main text-lg leading-tight">{e.title}</p>
                                            <div className="flex flex-wrap items-center gap-2 mt-1">
                                                <span className="px-2 py-0.5 rounded-full bg-bg-input text-[9px] font-black text-text-muted border border-border-card uppercase">{cycleLabel}</span>
                                                {e.payment_method && (
                                                    <span className="text-text-muted text-[10px] font-bold">via {e.payment_method}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                                        <div className="text-right">
                                            <p className="text-text-main font-black tabular-nums">{formatCurrency(rawAmt, e.currency || 'EUR')}</p>
                                            <p className="text-[10px] text-text-muted font-bold uppercase tracking-tighter mt-1 text-amber-500/80">Next: {nextDateStr}</p>
                                        </div>
                                        <button onClick={() => deleteDocById('emis', e.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-text-muted hover:text-rose-500 p-2 bg-bg-input border border-border-card rounded-xl shadow-sm cursor-pointer"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            )})}
                        </div>
                    </motion.div>
                )}

                {activeTab === 'history' && (
                    <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                        <header className="flex justify-between items-center mb-2 px-1">
                            <h3 className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                <CalendarDays size={14} className="text-[#21D89A]" /> Historical Logs
                            </h3>
                            <div className="flex items-center gap-4">
                                <button className="text-[10px] font-black uppercase text-[#21D89A] hover:underline">Export CSV</button>
                                {entries.length > 0 && (
                                    <button
                                        onClick={handleClearHistory}
                                        className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-rose-400 transition-colors"
                                    >
                                        <Trash2 size={11} /> Clear History
                                    </button>
                                )}
                            </div>
                        </header>
                        {entries.length === 0 ? (
                            <div className="py-20 text-center border-2 border-dashed border-white/[0.08] rounded-3xl text-slate-600 italic">Financial data history is empty.</div>
                        ) : (
                            monthlyGroups.map(([month, monthEntries]) => (
                                <MonthCard key={month} month={month} entries={monthEntries} displayCurrency={displayCurrency} rates={exchangeRates} />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <EmailPreviewModal
                isOpen={invoiceEmailPreviewOpen}
                onClose={() => setInvoiceEmailPreviewOpen(false)}
                title="Send Invoice Email"
                initialTo={invoiceEmailPreviewData.to}
                initialSubject={invoiceEmailPreviewData.subject}
                initialBody={invoiceEmailPreviewData.body}
                attachmentName={selectedEmailInvoice ? `Invoice_${selectedEmailInvoice.invoice_number}.pdf` : undefined}
                isLoading={invoicePdfLoading}
                loadingMessage="Generating & Hosting PDF Invoice..."
                onSentSuccess={handleInvoiceSentSuccess}
                onTriggerAutomation={handleTriggerInvoiceAutomation}
            />
        </div>
    </div>
);
};
