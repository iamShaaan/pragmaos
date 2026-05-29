import React, { useState } from 'react';
import { createDoc, updateDocById } from '../../firebase/firestore';
import type { Client } from '../../types';
import toast from 'react-hot-toast';
import { Plus, X, Phone, Mail } from 'lucide-react';

interface ClientFormProps {
    onClose: () => void;
    editClient?: Client;
}

const inputCls = 'w-full bg-[#F3F7F5] dark:bg-bg-input border border-border-input dark:border-[#22372D] text-text-main rounded-xl px-4 py-2.5 text-sm focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all placeholder:text-text-muted/40 font-semibold shadow-sm';
const labelCls = 'block text-text-muted text-xs font-bold uppercase tracking-wider mb-1.5 ml-1';

export const ClientForm: React.FC<ClientFormProps> = ({ onClose, editClient }) => {
    const [loading, setLoading] = useState(false);
    const [phoneInput, setPhoneInput] = useState('');
    const [emailInput, setEmailInput] = useState('');
    const [form, setForm] = useState({
        name: editClient?.name || '',
        company: editClient?.company || '',
        description: editClient?.description || '',
        website: editClient?.website || '',
        notes: editClient?.notes || '',
        phones: editClient?.phones || [] as string[],
        emails: editClient?.emails || [] as string[],
        tags: editClient?.tags || [] as string[],
    });

    const set = (k: string, v: string | string[]) => setForm((f) => ({ ...f, [k]: v }));

    const addPhone = () => {
        if (phoneInput.trim() && !form.phones.includes(phoneInput.trim())) {
            set('phones', [...form.phones, phoneInput.trim()]);
            setPhoneInput('');
        }
    };

    const addEmail = () => {
        if (emailInput.trim() && !form.emails.includes(emailInput.trim())) {
            set('emails', [...form.emails, emailInput.trim()]);
            setEmailInput('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name.trim()) { toast.error('Client name is required'); return; }
        setLoading(true);
        try {
            // Auto-commit any pending phone/email that was typed but not yet added via the + button
            const finalPhones = [...form.phones];
            if (phoneInput.trim() && !finalPhones.includes(phoneInput.trim())) {
                finalPhones.push(phoneInput.trim());
            }
            const finalEmails = [...form.emails];
            if (emailInput.trim() && !finalEmails.includes(emailInput.trim())) {
                finalEmails.push(emailInput.trim());
            }

            const data = { ...form, phones: finalPhones, emails: finalEmails, files: editClient?.files || [] };
            if (editClient) {
                await updateDocById('clients', editClient.id, data as Record<string, unknown>);
                toast.success('Client updated!');
            } else {
                await createDoc('clients', data as Record<string, unknown>);
                toast.success('Client added!');
            }
            onClose();
        } catch (err) {
            toast.error('Failed to save client');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className={labelCls}>Full Name *</label>
                    <input className={inputCls} placeholder="John Doe" value={form.name} onChange={(e) => set('name', e.target.value)} />
                </div>
                <div>
                    <label className={labelCls}>Company</label>
                    <input className={inputCls} placeholder="Acme Corp" value={form.company} onChange={(e) => set('company', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className={labelCls}>Short Description</label>
                    <input className={inputCls} placeholder="E.g. E-commerce giant" value={form.description} onChange={(e) => set('description', e.target.value)} />
                </div>
                <div className="col-span-2">
                    <label className={labelCls}>Website</label>
                    <input className={inputCls} type="url" placeholder="https://example.com" value={form.website} onChange={(e) => set('website', e.target.value)} />
                </div>
            </div>

            {/* Phones */}
            <div>
                <label className={labelCls}>Phone Numbers</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input className={`${inputCls} pl-8`} type="tel" placeholder="+43 1 234 567" value={phoneInput} onChange={(e) => setPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPhone())} />
                    </div>
                    <button type="button" onClick={addPhone} className="px-3 py-2 bg-[#DDFBF0] hover:bg-[#B7F3DD] text-[#047857] border border-[#B7F3DD] rounded-xl transition-all shadow-sm cursor-pointer">
                        <Plus size={15} />
                    </button>
                </div>
                {form.phones.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.phones.map((p) => (
                            <span key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F3F7F5] dark:bg-white/[0.06] text-text-main border border-border-card dark:border-transparent rounded-lg text-xs font-bold shadow-sm">
                                <Phone size={11} className="text-[#047857] dark:text-[#21D89A]" />{p}
                                <button type="button" onClick={() => set('phones', form.phones.filter((x) => x !== p))} className="text-text-muted hover:text-rose-500 ml-1 cursor-pointer"><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Emails */}
            <div>
                <label className={labelCls}>Email Addresses</label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                        <input className={`${inputCls} pl-8`} type="email" placeholder="client@company.com" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())} />
                    </div>
                    <button type="button" onClick={addEmail} className="px-3 py-2 bg-[#E0F2FE] hover:bg-[#BAE6FD] text-[#0369A1] border border-[#BAE6FD] rounded-xl transition-all shadow-sm cursor-pointer">
                        <Plus size={15} />
                    </button>
                </div>
                {form.emails.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.emails.map((e) => (
                            <span key={e} className="flex items-center gap-1.5 px-2.5 py-1 bg-[#F3F7F5] dark:bg-white/[0.06] text-text-main border border-border-card dark:border-transparent rounded-lg text-xs font-bold shadow-sm">
                                <Mail size={11} className="text-[#0369A1] dark:text-cyan-300" />{e}
                                <button type="button" onClick={() => set('emails', form.emails.filter((x) => x !== e))} className="text-text-muted hover:text-rose-500 ml-1 cursor-pointer"><X size={11} /></button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <label className={labelCls}>Notes</label>
                <textarea className={`${inputCls} resize-none`} rows={3} placeholder="Client preferences, important notes..." value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm text-text-muted hover:text-text-main font-bold transition-all cursor-pointer">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] text-sm font-bold rounded-xl transition-all shadow-sm disabled:opacity-50 active:scale-95 cursor-pointer">
                    {loading ? 'Saving...' : editClient ? 'Update Client' : 'Add Client'}
                </button>
            </div>
        </form>
    );
};
