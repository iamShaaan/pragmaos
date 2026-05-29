import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Lock, Shield, KeyRound, RotateCcw, AlertTriangle, Unlock,
    Plus, Pencil, Trash2, Tag, Search,
    Upload, Download, ExternalLink, Image, Video, FileText as FileTextIcon, File,
    Eye, EyeOff, FolderKanban, Loader2
} from 'lucide-react';
import { useAppStore } from '../store';
import { NoteEditor } from '../components/notes/NoteEditor';
import { Modal } from '../components/ui/Modal';
import type { Note, VaultFile } from '../types';
import { deleteDocById, createDoc } from '../firebase/firestore';
import { formatDate } from '../utils/timeFormat';
import toast from 'react-hot-toast';
import { db, APP_ID, storage, auth } from '../firebase/config';
import { doc, getDoc, setDoc, collection, query, where, orderBy, onSnapshot, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

// ─── PIN Hashing (SHA-256 via WebCrypto) ─────────────────────────────────────
const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin + '_taskmaster_vault');
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// ─── PIN Dot Display ──────────────────────────────────────────────────────────
const PinDots: React.FC<{
    value: string;
    inputRef: React.RefObject<HTMLInputElement | null>;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onChange: (v: string) => void;
    autoFocus?: boolean;
}> = ({ value, inputRef, onKeyDown, onChange, autoFocus }) => (
    <div className="relative">
        <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={value}
            autoFocus={autoFocus}
            onChange={e => onChange(e.target.value.replace(/\D/g, ''))}
            onKeyDown={onKeyDown}
            className="absolute inset-0 opacity-0 w-full h-full cursor-default"
            aria-label="PIN input"
        />
        <div className="flex gap-2 justify-center cursor-pointer" onClick={() => inputRef.current?.focus()}>
            {[0, 1, 2, 3, 4, 5].map(i => (
                <div
                    key={i}
                    className={`w-11 py-3 flex items-center justify-center rounded-xl border-2 text-xl font-black transition-all select-none ${
                        value.length > i
                            ? 'border-amber-500 bg-amber-500/20 text-amber-500'
                            : value.length === i
                                ? 'border-amber-500/60 bg-[#DDFBF0] dark:bg-black/30 text-transparent animate-pulse'
                                : 'border-border-card bg-[#F3F7F5] dark:bg-black/20 text-transparent'
                    }`}
                >
                    {value.length > i ? '●' : '·'}
                </div>
            ))}
        </div>
    </div>
);

// ─── Vault Lock Screen ────────────────────────────────────────────────────────
const VaultLockScreen: React.FC<{
    hasPin: boolean;
    onUnlock: (pin: string) => Promise<boolean>;
    onSetPin: (pin: string) => Promise<void>;
    onResetPin: () => Promise<void>;
}> = ({ hasPin, onUnlock, onSetPin, onResetPin }) => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [step, setStep] = useState<'enter' | 'set' | 'confirm' | 'resetConfirm'>(hasPin ? 'enter' : 'set');
    const [loading, setLoading] = useState(false);
    const [wrongAttempts, setWrongAttempts] = useState(0);

    const pinRef = useRef<HTMLInputElement>(null);
    const confirmRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const t = setTimeout(() => {
            if (step === 'enter' || step === 'set') pinRef.current?.focus();
            else if (step === 'confirm') confirmRef.current?.focus();
        }, 100);
        return () => clearTimeout(t);
    }, [step]);

    const handleEnter = async () => {
        if (pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
        setLoading(true);
        const ok = await onUnlock(pin);
        setLoading(false);
        if (!ok) { setWrongAttempts(w => w + 1); setPin(''); setTimeout(() => pinRef.current?.focus(), 50); }
    };

    const handleSetPin = () => {
        if (pin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
        setStep('confirm'); setConfirmPin('');
    };

    const handleConfirm = async () => {
        if (confirmPin !== pin) {
            toast.error('PINs do not match'); setConfirmPin('');
            setTimeout(() => confirmRef.current?.focus(), 50); return;
        }
        setLoading(true);
        await onSetPin(pin);
        setLoading(false);
    };

    const handleReset = async () => {
        setLoading(true);
        await onResetPin();
        setLoading(false);
    };

    return (
        <div className="flex items-center justify-center min-h-[500px]">
            <div className="bg-bg-card border border-border-card rounded-[22px] p-8 sm:p-12 text-center max-w-sm w-full shadow-sm relative overflow-hidden">
                <div className="absolute inset-0 bg-amber-500/[0.02] pointer-events-none rounded-2xl" />
                <div className="relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-sm">
                        {step === 'enter' ? <Lock size={28} className="text-amber-500" />
                            : step === 'set' ? <Shield size={28} className="text-amber-500" />
                            : step === 'resetConfirm' ? <RotateCcw size={28} className="text-rose-500" />
                            : <KeyRound size={28} className="text-amber-500" />}
                    </div>

                    {step === 'enter' && (<>
                        <h3 className="text-text-main font-black text-xl mb-1">Secure Vault</h3>
                        <p className="text-text-muted text-xs mb-6">Enter your vault PIN to access your notes & files</p>
                        {wrongAttempts > 0 && (
                            <p className="text-rose-500 text-xs mb-3 font-bold">
                                ❌ Wrong PIN — {wrongAttempts} failed {wrongAttempts === 1 ? 'attempt' : 'attempts'}
                            </p>
                        )}
                        <div className="mb-6">
                            <PinDots value={pin} inputRef={pinRef} onChange={setPin} autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleEnter()} />
                        </div>
                        <button onClick={handleEnter} disabled={loading || pin.length < 4}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black py-3 rounded-xl transition-all active:scale-95 mb-3 shadow-sm cursor-pointer">
                            {loading ? 'Verifying...' : 'Unlock Vault'}
                        </button>
                        <button onClick={() => setStep('resetConfirm')}
                            className="text-text-muted hover:text-text-main text-xs transition-colors flex items-center justify-center gap-1 w-full cursor-pointer">
                            <RotateCcw size={11} /> Forgot vault PIN?
                        </button>
                    </>)}

                    {step === 'set' && (<>
                        <h3 className="text-text-main font-black text-xl mb-1">Set Vault PIN</h3>
                        <p className="text-text-muted text-xs mb-2">Choose a 4–6 digit PIN for your secure vault.</p>
                        <p className="text-amber-600 dark:text-amber-400 text-[10px] mb-6 flex items-center justify-center gap-1 font-bold">
                            <AlertTriangle size={10} /> Store this PIN safely — you can reset it if forgotten.
                        </p>
                        <div className="mb-6">
                            <PinDots value={pin} inputRef={pinRef} onChange={setPin} autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleSetPin()} />
                        </div>
                        <button onClick={handleSetPin} disabled={pin.length < 4}
                            className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black py-3 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer">
                            Continue →
                        </button>
                    </>)}

                    {step === 'confirm' && (<>
                        <h3 className="text-text-main font-black text-xl mb-1">Confirm PIN</h3>
                        <p className="text-text-muted text-xs mb-6">Enter the same PIN again to confirm</p>
                        <div className="mb-6">
                            <PinDots value={confirmPin} inputRef={confirmRef} onChange={setConfirmPin} autoFocus
                                onKeyDown={e => e.key === 'Enter' && handleConfirm()} />
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => { setStep('set'); setConfirmPin(''); }}
                                className="flex-1 bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] text-text-muted font-bold py-3 rounded-xl transition-all cursor-pointer shadow-sm">
                                ← Back
                            </button>
                            <button onClick={handleConfirm} disabled={loading || confirmPin.length < 4}
                                className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white font-black py-3 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer">
                                {loading ? 'Saving...' : 'Confirm'}
                            </button>
                        </div>
                    </>)}

                    {step === 'resetConfirm' && (<>
                        <h3 className="text-rose-500 font-black text-xl mb-1">Reset Vault PIN</h3>
                        <p className="text-text-main text-sm mb-2">This will <strong>clear your existing vault PIN</strong> so you can set a new one.</p>
                        <p className="text-text-muted text-xs mb-6">Your vault content is still safe in Firestore — only the PIN lock is reset.</p>
                        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl mb-6">
                            <p className="text-rose-600 dark:text-rose-300 text-xs font-bold">⚠️ Once reset, you'll need to set a new PIN before accessing the vault.</p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setStep('enter')}
                                className="flex-1 bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] text-text-muted font-bold py-3 rounded-xl transition-all cursor-pointer shadow-sm">
                                Cancel
                            </button>
                            <button onClick={handleReset} disabled={loading}
                                className="flex-1 bg-rose-500 hover:bg-rose-600 disabled:opacity-40 text-white font-black py-3 rounded-xl transition-all active:scale-95 shadow-sm cursor-pointer">
                                {loading ? 'Resetting...' : 'Reset PIN'}
                            </button>
                        </div>
                    </>)}
                </div>
            </div>
        </div>
    );
};

// ─── File icon helper ─────────────────────────────────────────────────────────
const FileIcon: React.FC<{ type: string; size?: number }> = ({ type, size = 20 }) => {
    if (type.startsWith('image/')) return <Image size={size} className="text-[#0369A1] dark:text-cyan-300" />;
    if (type.startsWith('video/')) return <Video size={size} className="text-[#7C5CFC] dark:text-purple-400" />;
    if (type === 'application/pdf') return <FileTextIcon size={size} className="text-rose-500" />;
    return <File size={size} className="text-text-muted" />;
};

const formatBytes = (bytes: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
};

// ─── Note Card ────────────────────────────────────────────────────────────────
const NoteCard: React.FC<{
    note: Note;
    projects: any[];
    revealedNotes: string[];
    onView: (n: Note) => void;
    onEdit: (n: Note) => void;
    onDelete: (id: string) => void;
    onToggleReveal: (id: string) => void;
}> = ({ note, projects, revealedNotes, onView, onEdit, onDelete, onToggleReveal }) => {
    const isRevealed = revealedNotes.includes(note.id);
    const project = note.linked_project_id ? projects.find(p => p.id === note.linked_project_id) : null;

    return (
        <div
            onClick={() => isRevealed && onView(note)}
            className={`group bg-bg-card border border-border-card rounded-xl p-4 hover:border-amber-500/40 transition-all shadow-sm ${isRevealed ? 'cursor-pointer' : ''}`}
        >
            <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                    <Lock size={12} className="text-amber-500 flex-shrink-0" />
                    <h3 className="text-text-main font-bold text-sm truncate max-w-[150px]">{note.title}</h3>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e => { e.stopPropagation(); onToggleReveal(note.id); }}
                        className="p-1.5 text-text-muted hover:text-amber-500 rounded-lg transition-all cursor-pointer">
                        {isRevealed ? <EyeOff size={13} /> : <Eye size={13} />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); onEdit(note); }}
                        className="p-1.5 text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] rounded-lg hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] transition-all cursor-pointer">
                        <Pencil size={13} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); onDelete(note.id); }}
                        className="p-1.5 text-text-muted hover:text-rose-500 rounded-lg hover:bg-[#FFE4E8] dark:hover:bg-rose-950/30 transition-all cursor-pointer">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
            <div className={`text-text-muted text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-28 overflow-hidden ${!isRevealed ? 'blur-sm select-none opacity-40' : ''}`}>
                {note.content || <span className="text-text-muted/40 italic">Empty note</span>}
            </div>
            {note.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">
                    {note.tags.map(t => (
                        <span key={t} className="text-xs text-text-muted bg-[#F3F7F5] dark:bg-white/[0.06] border border-[#DDE8E2] dark:border-transparent px-1.5 py-0.5 rounded-full flex items-center gap-1">
                            <Tag size={9} />{t}
                        </span>
                    ))}
                </div>
            )}
            {project && (
                <div className="mt-3 flex items-center gap-1.5 text-[10px] font-bold text-[#047857] dark:text-[#21D89A] bg-[#DDFBF0] dark:bg-[#21D89A]/10 border border-[#B7F3DD] dark:border-[#21D89A]/20 px-2 py-1 rounded-md w-fit">
                    <FolderKanban size={10} /> {project.name}
                </div>
            )}
            <p className="text-text-muted/65 text-[10px] font-bold uppercase mt-3">{formatDate(note.updated_at)}</p>
        </div>
    );
};

// ─── Vault Notes Tab ──────────────────────────────────────────────────────────
const VaultNotes: React.FC<{ uid: string }> = () => {
    const { notes, projects } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [editNote, setEditNote] = useState<Note | undefined>();
    const [viewNote, setViewNote] = useState<Note | undefined>();
    const [search, setSearch] = useState('');
    const [revealedNotes, setRevealedNotes] = useState<string[]>([]);

    // Personal notes: not linked to projects (project notes live in the project)
    const personalNotes = [...notes]
        .filter(n => !n.linked_project_id)
        .sort((a, b) => {
            const aT = (a.updated_at instanceof Date) ? a.updated_at.getTime() : 0;
            const bT = (b.updated_at instanceof Date) ? b.updated_at.getTime() : 0;
            return bT - aT;
        });

    const filtered = personalNotes.filter(n => {
        const s = search.toLowerCase();
        return (n.title || '').toLowerCase().includes(s) || (n.content || '').toLowerCase().includes(s);
    });

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this note?')) return;
        await deleteDocById('notes', id);
        toast.success('Note deleted');
    };

    const toggleReveal = (id: string) => {
        setRevealedNotes(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    return (
        <div className="space-y-4">
            {/* Search + New */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input
                        className="w-full bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] text-text-main placeholder-text-muted/40 rounded-xl pl-9 pr-3 py-2.5 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-bold"
                        placeholder="Search notes..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => { setEditNote(undefined); setShowForm(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all flex-shrink-0 cursor-pointer shadow-sm"
                >
                    <Plus size={16} /> New Note
                </button>
            </div>

            {/* Notes Grid */}
            {filtered.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-border-card dark:border-[#22372D]/40 rounded-2xl bg-[#F3F7F5]/30">
                    <Lock size={32} className="text-amber-500/20 mx-auto mb-3" />
                    <p className="text-text-muted text-sm font-bold">No personal notes yet</p>
                    <p className="text-text-muted/60 text-xs mt-1">Create your first private note above.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(note => (
                        <NoteCard
                            key={note.id}
                            note={note}
                            projects={projects}
                            revealedNotes={revealedNotes}
                            onView={setViewNote}
                            onEdit={n => { setEditNote(n); setShowForm(true); }}
                            onDelete={handleDelete}
                            onToggleReveal={toggleReveal}
                        />
                    ))}
                </div>
            )}

            {/* Note Editor Modal */}
            <Modal isOpen={showForm} onClose={() => { setEditNote(undefined); setShowForm(false); }} title={editNote ? 'Edit Note' : 'New Note'} size="lg">
                <NoteEditor
                    onClose={() => { setEditNote(undefined); setShowForm(false); }}
                    editNote={editNote}
                    defaultSecure
                />
            </Modal>

            {/* View Modal */}
            <Modal isOpen={!!viewNote} onClose={() => setViewNote(undefined)} title={viewNote?.title || 'Note'} size="lg">
                {viewNote && (
                    <div className="space-y-4">
                        <div className="bg-[#F3F7F5] dark:bg-[#0D1612] rounded-xl p-4 max-h-[60vh] overflow-y-auto custom-scrollbar border border-border-card dark:border-[#22372D]">
                            <pre className="text-text-main text-sm whitespace-pre-wrap font-sans leading-relaxed">
                                {viewNote.content || <span className="text-text-muted italic">Empty note</span>}
                            </pre>
                        </div>
                        <div className="flex items-center justify-between border-t border-border-card dark:border-[#22372D] pt-4">
                            <div className="flex flex-wrap gap-2">
                                {viewNote.tags?.map(t => (
                                    <span key={t} className="text-xs text-text-muted bg-[#F3F7F5] dark:bg-white/[0.06] border border-border-card dark:border-transparent px-2 py-1 rounded-md flex items-center gap-1 font-bold">
                                        <Tag size={10} /> {t}
                                    </span>
                                ))}
                            </div>
                            <button
                                onClick={() => { setEditNote(viewNote); setViewNote(undefined); setShowForm(true); }}
                                className="px-3 py-1.5 bg-[#DDFBF0] text-[#047857] hover:bg-[#DDFBF0]/80 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border border-[#B7F3DD] shadow-sm cursor-pointer"
                            >
                                <Pencil size={14} /> Edit
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

// ─── Vault Files Tab ──────────────────────────────────────────────────────────
const VaultFiles: React.FC<{ uid: string }> = ({ uid }) => {
    const [files, setFiles] = useState<VaultFile[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [deleting, setDeleting] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Real-time listener for vault files
    useEffect(() => {
        if (!uid) return;
        setLoadingFiles(true);
        const q = query(
            collection(db, `apps/${APP_ID}/vault_files`),
            where('owner_id', '==', uid),
            orderBy('created_at', 'desc')
        );
        const unsub = onSnapshot(q, (snap) => {
            setFiles(snap.docs.map(d => {
                const data = d.data();
                return {
                    ...data,
                    id: d.id,
                    created_at: data.created_at?.toDate?.() || new Date(),
                } as VaultFile;
            }));
            setLoadingFiles(false);
        }, (err) => {
            console.error('Vault files listener error:', err);
            if (err.message.includes('index')) {
                toast.error('Vault index is still building. Please wait a few minutes.', { id: 'index-error' });
            }
            setLoadingFiles(false);
        });
        return unsub;
    }, [uid]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !uid) return;

        setUploading(true);
        setUploadProgress(0);

        const fileId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const storagePath = `apps/${APP_ID}/vault/${uid}/${fileId}_${file.name}`;
        const storageRef = ref(storage, storagePath);

        try {
            const uploadTask = uploadBytesResumable(storageRef, file);

            await new Promise<void>((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        setUploadProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
                    },
                    reject,
                    resolve
                );
            });

            const url = await getDownloadURL(storageRef);

            await createDoc('vault_files', {
                name: file.name,
                url,
                type: file.type,
                size: file.size,
                storage_path: storagePath,
                owner_id: uid,
            });

            toast.success(`${file.name} uploaded to vault`);
        } catch (err) {
            console.error(err);
            toast.error('Upload failed');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (f: VaultFile) => {
        if (!confirm(`Delete "${f.name}"? This cannot be undone.`)) return;
        setDeleting(f.id);
        try {
            // Delete from Storage
            await deleteObject(ref(storage, f.storage_path)).catch(() => { /* ignore if missing */ });
            // Delete Firestore doc
            await deleteDoc(doc(db, `apps/${APP_ID}/vault_files`, f.id));
            toast.success(`${f.name} deleted`);
        } catch (err) {
            console.error(err);
            toast.error('Failed to delete file');
        } finally {
            setDeleting(null);
        }
    };

    return (
        <div className="space-y-5">
            {/* Upload zone */}
            <div
                className="border-2 border-dashed border-border-card hover:border-[#21D89A]/50 dark:hover:border-[#21D89A]/30 rounded-[22px] p-8 text-center bg-bg-card transition-all cursor-pointer group shadow-sm"
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload} />
                {uploading ? (
                    <div className="space-y-3">
                        <Loader2 size={32} className="text-amber-500 mx-auto animate-spin" />
                        <div className="w-full bg-[#E7EEE9] dark:bg-white/[0.06] rounded-full h-2 overflow-hidden">
                            <div
                                className="h-full bg-amber-500 rounded-full transition-all"
                                style={{ width: `${uploadProgress}%` }}
                            />
                        </div>
                        <p className="text-amber-500 text-sm font-bold">Uploading... {uploadProgress}%</p>
                    </div>
                ) : (
                    <>
                        <Upload size={32} className="text-amber-500/30 group-hover:text-amber-500 mx-auto mb-3 transition-colors" />
                        <p className="text-text-main text-sm font-semibold">Click to upload a private file</p>
                        <p className="text-text-muted text-xs mt-1">Videos, images, PDFs, documents — anything goes</p>
                        <p className="text-[#047857] dark:text-[#21D89A] text-[10px] mt-3 font-black uppercase tracking-wider">🔒 Private Vault Storage</p>
                    </>
                )}
            </div>

            {/* File list */}
            {loadingFiles ? (
                <div className="text-center py-8 text-text-muted text-sm animate-pulse">Loading files...</div>
            ) : files.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-border-card rounded-2xl bg-[#F3F7F5]/30">
                    <File size={32} className="text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted text-sm font-bold">No vault files yet</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {files.map(f => (
                        <div
                            key={f.id}
                            className={`bg-bg-card border border-border-card rounded-xl p-4 transition-all group shadow-sm ${deleting === f.id ? 'opacity-40' : 'hover:border-amber-500/30 dark:hover:border-amber-500/40'}`}
                        >
                            {/* Thumbnail for images */}
                            {f.type.startsWith('image/') && (
                                <div className="w-full h-28 rounded-lg overflow-hidden mb-3 bg-[#F3F7F5] dark:bg-black/30 border border-border-card">
                                    <img src={f.url} alt={f.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                            {/* Video icon */}
                            {f.type.startsWith('video/') && (
                                <div className="w-full h-28 rounded-lg overflow-hidden mb-3 bg-[#F3F7F5] dark:bg-black/30 border border-border-card flex items-center justify-center">
                                    <Video size={36} className="text-[#7C5CFC]/30" />
                                </div>
                            )}

                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                    <FileIcon type={f.type} size={16} />
                                    <div className="min-w-0">
                                        <p className="text-text-main text-xs font-semibold truncate">{f.name}</p>
                                        <p className="text-text-muted text-[10px] font-bold mt-0.5">{formatBytes(f.size)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                    <a href={f.url} download={f.name} title="Download"
                                        className="p-1.5 text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] transition-colors rounded-lg hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23]">
                                        <Download size={13} />
                                    </a>
                                    <a href={f.url} target="_blank" rel="noopener noreferrer" title="Open"
                                        className="p-1.5 text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] transition-colors rounded-lg hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23]">
                                        <ExternalLink size={13} />
                                    </a>
                                    <button onClick={() => handleDelete(f)} disabled={deleting === f.id}
                                        title="Delete"
                                        className="p-1.5 text-text-muted hover:text-rose-500 hover:bg-[#FFE4E8] dark:hover:bg-rose-950/30 rounded-lg transition-all disabled:opacity-30 cursor-pointer">
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Vault Page ──────────────────────────────────────────────────────────
export const Vault: React.FC = () => {
    const [vaultUnlocked, setVaultUnlocked] = useState(false);
    const [storedPinHash, setStoredPinHash] = useState<string | null>(null);
    const [pinLoading, setPinLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'notes' | 'files'>('notes');

    const uid = auth.currentUser?.uid;
    const { clients, projects } = useAppStore();
    const [stats, setStats] = useState({ vaultSize: 0, appSize: 0 });

    // Separate listener for vault files to calculate stats
    useEffect(() => {
        if (!uid || !vaultUnlocked) return;
        const q = query(
            collection(db, `apps/${APP_ID}/vault_files`),
            where('owner_id', '==', uid)
        );
        return onSnapshot(q, (snap) => {
            const files = snap.docs.map(d => d.data() as VaultFile);
            
            const vaultSize = files.reduce((acc, f) => acc + (f.size || 0), 0);
            
            // Calculate other app files (Clients/Projects)
            const clientFilesSize = clients.flatMap(c => c.files || []).reduce((acc, f) => acc + (f.size || 0), 0);
            const projectFilesSize = projects.flatMap(p => p.files || []).reduce((acc, f) => acc + (f.size || 0), 0);
            
            setStats({
                vaultSize,
                appSize: vaultSize + clientFilesSize + projectFilesSize
            });
        });
    }, [uid, vaultUnlocked, clients, projects]);

    // Load stored vault PIN hash from Firestore
    useEffect(() => {
        if (!uid) return;
        const load = async () => {
            try {
                const snap = await getDoc(doc(db, `apps/${APP_ID}/users`, uid));
                setStoredPinHash(snap.data()?.vault_pin_hash || null);
            } catch {
                setStoredPinHash(null);
            } finally {
                setPinLoading(false);
            }
        };
        load();
    }, [uid]);

    const handleUnlock = useCallback(async (pin: string): Promise<boolean> => {
        const hash = await hashPin(pin);
        if (hash === storedPinHash) {
            setVaultUnlocked(true);
            toast.success('🔓 Vault unlocked');
            return true;
        }
        toast.error('Wrong PIN — try again');
        return false;
    }, [storedPinHash]);

    const handleSetPin = useCallback(async (pin: string) => {
        if (!uid) return;
        const hash = await hashPin(pin);
        try {
            await setDoc(doc(db, `apps/${APP_ID}/users`, uid), { vault_pin_hash: hash }, { merge: true });
            setStoredPinHash(hash);
            setVaultUnlocked(true);
            toast.success('✅ Vault PIN set! Vault is now unlocked.');
        } catch {
            toast.error('Failed to save PIN');
        }
    }, [uid]);

    const handleResetPin = useCallback(async () => {
        if (!uid) return;
        try {
            await setDoc(doc(db, `apps/${APP_ID}/users`, uid), { vault_pin_hash: null }, { merge: true });
            setStoredPinHash(null);
            setVaultUnlocked(false);
            toast.success('Vault PIN reset. Set a new PIN below.');
        } catch {
            toast.error('Failed to reset PIN');
        }
    }, [uid]);

    if (pinLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full border-t-2 border-b-2 border-amber-500 h-10 w-10" />
            </div>
        );
    }

    if (!vaultUnlocked) {
        return (
            <VaultLockScreen
                hasPin={!!storedPinHash}
                onUnlock={handleUnlock}
                onSetPin={handleSetPin}
                onResetPin={handleResetPin}
            />
        );
    }

    return (
        <div className="space-y-6 bg-bg-card border border-border-card rounded-[28px] p-6 sm:p-8 shadow-sm">
            {/* Vault Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shadow-sm">
                        <Unlock size={18} className="text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-text-main font-black text-lg">Vault Unlocked</h2>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
                            <p className="text-text-muted text-xs text-nowrap">Your personal notes & private files</p>
                            <div className="flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                                <p className="text-amber-500/80 text-[10px] font-bold uppercase tracking-wider">
                                    Vault: {formatBytes(stats.vaultSize)}
                                </p>
                                <span className="w-1 h-1 rounded-full bg-text-muted/30" />
                                <p className="text-[#047857] dark:text-[#21D89A] text-[10px] font-bold uppercase tracking-wider">
                                    Total App: {formatBytes(stats.appSize)}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => { setVaultUnlocked(false); }}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#F3F7F5] hover:bg-[#EEF7F2] dark:bg-[#15221C] dark:hover:bg-[#1A2B23] border border-border-card dark:border-[#22372D] text-text-muted hover:text-text-main text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm sm:w-auto w-full"
                >
                    <Lock size={13} /> Lock Vault
                </button>
            </div>

            {/* Inner Tabs */}
            <div className="flex gap-2 border-b border-border-card dark:border-[#22372D] pb-1">
                {(['notes', 'files'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-t-xl text-sm font-bold capitalize transition-all border-b-2 cursor-pointer ${
                            activeTab === tab
                                ? 'bg-amber-500/5 text-amber-500 border-amber-500'
                                : 'text-text-muted hover:text-text-main border-transparent'
                        }`}
                    >
                        {tab === 'notes' ? '📝 Notes' : '📁 Files'}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'notes' && uid ? <VaultNotes uid={uid} /> : null}
            {activeTab === 'files' && uid ? <VaultFiles uid={uid} /> : null}
        </div>
    );
};
