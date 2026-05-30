import React, { useState, useEffect } from 'react';
import type { Note } from '../../types';
import { createDoc, updateDocById } from '../../firebase/firestore';
import { auth, db, APP_ID } from '../../firebase/config';
import { getDoc, doc } from 'firebase/firestore';
import { useAppStore } from '../../store';
import { encryptText, decryptText } from '../../utils/crypto';
import toast from 'react-hot-toast';
import { Lock, Unlock, Zap, Loader2 } from 'lucide-react';

interface NoteEditorProps {
    onClose: () => void;
    editNote?: Note;
    linked_project_id?: string;
    defaultSecure?: boolean;
}

const inputCls = 'w-full bg-bg-input border border-border-input text-text-main rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#21D89A] transition-colors placeholder:text-slate-500/70';
const labelCls = 'block text-text-muted text-xs font-medium mb-1';

export const NoteEditor: React.FC<NoteEditorProps> = ({ onClose, editNote, linked_project_id, defaultSecure }) => {
    const { vaultKey } = useAppStore();
    const [loading, setLoading] = useState(false);
    const [decrypting, setDecrypting] = useState(false);
    const [tagInput, setTagInput] = useState('');
    const [form, setForm] = useState({
        title: editNote?.title || '',
        content: editNote?.content || '',
        tags: editNote?.tags || [] as string[],
        is_secure: editNote?.is_secure ?? defaultSecure ?? false,
        is_credential: editNote?.is_credential || false,
        linked_project_id: editNote?.linked_project_id || linked_project_id || null,
    });

    // Asynchronously decrypt secure notes on edit mount
    useEffect(() => {
        if (editNote?.is_secure) {
            if (!vaultKey) {
                toast.error("Vault locked — unlock your vault to edit secure notes");
                onClose();
                return;
            }
            setDecrypting(true);
            decryptText(editNote.content, vaultKey)
                .then((plainText) => {
                    setForm((f) => ({ ...f, content: plainText }));
                })
                .catch((e) => {
                    console.error("Failed to decrypt editNote:", e);
                    toast.error("Unable to decrypt note: key invalid or corrupted.");
                    onClose();
                })
                .finally(() => {
                    setDecrypting(false);
                });
        }
    }, [editNote, vaultKey, onClose]);

    const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

    const addTag = () => {
        if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
            set('tags', [...form.tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.title.trim()) { toast.error('Title required'); return; }
        setLoading(true);
        try {
            let finalContent = form.content;
            if (form.is_secure) {
                if (!vaultKey) {
                    toast.error("Vault locked — unlock your vault to save secure notes.");
                    setLoading(false);
                    return;
                }
                const uid = auth.currentUser?.uid;
                if (!uid) {
                    toast.error("User session expired.");
                    setLoading(false);
                    return;
                }
                // Retrieve user profile salt
                const userSnap = await getDoc(doc(db, `apps/${APP_ID}/users`, uid));
                const saltHex = userSnap.data()?.vault_salt || "";
                
                // Encrypt note content
                finalContent = await encryptText(form.content, vaultKey, saltHex);
            }

            const payload = {
                ...form,
                content: finalContent,
                updated_at: new Date()
            };

            if (editNote) {
                await updateDocById('notes', editNote.id, payload);
                toast.success('Note updated!');
            } else {
                await createDoc('notes', { ...payload, owner_id: auth.currentUser?.uid });
                toast.success('Note saved!');
            }
            onClose();
        } catch (e) {
            console.error("Save error:", e);
            toast.error('Failed to save note');
        } finally {
            setLoading(false);
        }
    };

    if (decrypting) {
        return (
            <div className="flex items-center justify-center p-8 space-x-2 text-text-muted">
                <Loader2 className="animate-spin text-amber-500" size={18} />
                <span className="text-sm font-semibold">Decrypting note...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex-1">
                    <label className={labelCls}>Title *</label>
                    <input className={inputCls} placeholder="Note title..." value={form.title} onChange={(e) => set('title', e.target.value)} />
                </div>
                <div className="pt-4 flex gap-2">
                    <button
                        type="button"
                        onClick={() => set('is_secure', !form.is_secure)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${form.is_secure
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-bg-input text-text-muted border-border-input hover:border-[#21D89A]/40'
                            }`}
                        title="Toggle secure/vault mode"
                    >
                        {form.is_secure ? <Lock size={14} /> : <Unlock size={14} />}
                        {form.is_secure ? 'Vault' : 'Normal'}
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            set('is_credential', !form.is_credential);
                            if (!form.is_credential) {
                                set('content', `SERVICE: \nAPI KEY: \nURL: \nNOTES: \n${form.content}`);
                            }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all ${form.is_credential
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : 'bg-bg-input text-text-muted border-border-input hover:border-[#21D89A]/40'
                            }`}
                    >
                        <Zap size={14} />
                        {form.is_credential ? 'Credential' : 'Standard'}
                    </button>
                </div>
            </div>

            {(form.is_secure || form.is_credential) && (
                <div className="flex items-center gap-3 p-3 bg-[#21D89A]/10 border border-[#21D89A]/20 rounded-xl">
                    <Zap size={15} className="text-[#21D89A]" />
                    <p className="text-[#21D89A] text-[10px] font-medium leading-relaxed">
                        {form.is_credential ? "Credential mode enabled. Template injected for secure storage." : "Vault mode enabled. This note will be hidden behind your PIN."}
                    </p>
                </div>
            )}

            <div>
                <label className={labelCls}>Content</label>
                <textarea
                    className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                    rows={14}
                    placeholder={form.is_secure
                        ? 'Store your API keys, passwords, tokens...\n\nFORMAT TIP:\nService: OpenAI\nKey: sk-...\nUsage: GPT-4 calls'
                        : 'Write your note here...'
                    }
                    value={form.content}
                    onChange={(e) => set('content', e.target.value)}
                />
            </div>

            {/* Tags */}
            <div>
                <label className={labelCls}>Tags</label>
                <div className="flex gap-2">
                    <input className={`${inputCls} flex-1`} placeholder="api-key, secret, config..." value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} />
                    <button type="button" onClick={addTag} className="px-3 py-2 bg-[#21D89A]/15 text-[#21D89A] border border-[#21D89A]/30 rounded-lg hover:bg-[#21D89A]/25 text-sm">Add</button>
                </div>
                {form.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {form.tags.map((t) => (
                            <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-white/[0.06] text-slate-300 rounded-full text-xs">
                                {t}
                                <button type="button" onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="text-slate-500 hover:text-rose-400 ml-0.5">×</button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-slate-400 hover:text-slate-100 transition-colors">Cancel</button>
                <button type="submit" disabled={loading} className="px-5 py-2 bg-gradient-to-r from-[#21D89A] to-[#047857] hover:opacity-90 text-black text-sm font-bold rounded-lg transition-all disabled:opacity-50 active:scale-95">
                    {loading ? 'Saving...' : editNote ? 'Update Note' : 'Save Note'}
                </button>
            </div>
        </form>
    );
};
