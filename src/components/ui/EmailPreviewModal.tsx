import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Mail, Send, X, Paperclip, Check, Loader2, Sparkles } from 'lucide-react';
import { getGmailComposeUrl } from '../../utils/gmail';
import toast from 'react-hot-toast';

interface EmailPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    initialTo: string;
    initialSubject: string;
    initialBody: string;
    attachmentName?: string;
    isLoading?: boolean;
    loadingMessage?: string;
    onSentSuccess?: () => void;
    onTriggerAutomation?: (data: { to: string; subject: string; body: string }) => Promise<void>;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
    isOpen,
    onClose,
    title,
    initialTo,
    initialSubject,
    initialBody,
    attachmentName,
    isLoading = false,
    loadingMessage = 'Processing...',
    onSentSuccess,
    onTriggerAutomation,
}) => {
    const [to, setTo] = useState(initialTo);
    const [subject, setSubject] = useState(initialSubject);
    const [body, setBody] = useState(initialBody);
    const [sendingAutomation, setSendingAutomation] = useState(false);

    // Sync state when props change
    useEffect(() => {
        if (isOpen) {
            setTo(initialTo);
            setSubject(initialSubject);
            setBody(initialBody);
        }
    }, [isOpen, initialTo, initialSubject, initialBody]);

    const handleComposeGmail = () => {
        if (!to.trim()) {
            toast.error('Recipient email is required');
            return;
        }
        if (!subject.trim()) {
            toast.error('Subject is required');
            return;
        }
        if (!body.trim()) {
            toast.error('Email body is required');
            return;
        }

        const gmailUrl = getGmailComposeUrl({ to, subject, body });
        window.open(gmailUrl, '_blank');
        toast.success('Gmail composition tab opened!');
        if (onSentSuccess) onSentSuccess();
        onClose();
    };

    const handleTriggerAutomation = async () => {
        if (!onTriggerAutomation) return;
        if (!to.trim()) {
            toast.error('Recipient email is required');
            return;
        }

        setSendingAutomation(true);
        try {
            await onTriggerAutomation({ to, subject, body });
            toast.success('Automated email request logged successfully!');
            if (onSentSuccess) onSentSuccess();
            onClose();
        } catch (err) {
            toast.error('Failed to trigger automation');
            console.error(err);
        } finally {
            setSendingAutomation(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
            />

            {/* Modal Body */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-2xl bg-bg-card border border-border-card rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Glowing top line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#21D89A] via-[#047857] to-[#21D89A] opacity-80" />

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border-card/55 bg-bg-card/40 backdrop-blur-xl">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-[#21D89A]/15 text-[#21D89A]">
                            <Mail size={18} />
                        </div>
                        <div>
                            <h2 className="text-text-main font-bold text-base font-display tracking-tight">{title}</h2>
                            <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mt-0.5">Email Preview</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-text-muted hover:text-[#21D89A] hover:bg-bg-input transition-all duration-200 cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-1">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <Loader2 size={36} className="text-[#21D89A] animate-spin" />
                            <p className="text-text-main font-bold text-sm">{loadingMessage}</p>
                            <p className="text-text-muted text-xs">Please wait while the system generates and hosts the secure invoice PDF.</p>
                        </div>
                    ) : (
                        <>
                            {/* To field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Recipients (To)</label>
                                <input
                                    type="text"
                                    value={to}
                                    onChange={(e) => setTo(e.target.value)}
                                    placeholder="client@company.com, partner@company.com"
                                    className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                />
                            </div>

                            {/* Subject field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Subject</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    placeholder="Subject line..."
                                    className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-2.5 text-sm text-text-main outline-none focus:border-[#21D89A] transition-colors"
                                />
                            </div>

                            {/* Attachment rendering */}
                            {attachmentName && (
                                <div className="flex items-center justify-between p-3.5 bg-bg-input/60 rounded-xl border border-border-input">
                                    <div className="flex items-center gap-2.5">
                                        <Paperclip size={14} className="text-[#21D89A]" />
                                        <span className="text-xs font-semibold text-text-main truncate max-w-[280px] sm:max-w-[400px]">
                                            {attachmentName}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-[#21D89A]">
                                        <Check size={14} />
                                        <span className="text-[9px] font-bold uppercase tracking-widest">Hosted Securely</span>
                                    </div>
                                </div>
                            )}

                            {/* Body field */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest pl-1">Email Body</label>
                                <textarea
                                    value={body}
                                    onChange={(e) => setBody(e.target.value)}
                                    placeholder="Email body text..."
                                    rows={8}
                                    className="w-full bg-bg-input border border-border-input rounded-xl px-4 py-3 text-sm text-text-main outline-none focus:border-[#21D89A] custom-scrollbar resize-none placeholder:text-text-muted/40 transition-colors"
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Actions */}
                {!isLoading && (
                    <div className="p-6 bg-bg-app border-t border-border-card/55 flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={onClose}
                            className="w-full sm:flex-1 py-3 text-sm font-bold text-text-muted hover:text-text-main hover:bg-bg-input rounded-xl transition-all duration-200 cursor-pointer"
                        >
                            Cancel
                        </button>
                        
                        {onTriggerAutomation && (
                            <button
                                onClick={handleTriggerAutomation}
                                disabled={sendingAutomation}
                                className="w-full sm:flex-1 py-3 bg-bg-input border border-border-input hover:border-[#21D89A]/30 text-text-main text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                {sendingAutomation ? (
                                    <>
                                        <Loader2 size={14} className="animate-spin" /> Log Automation...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles size={13} className="text-[#21D89A]" /> Send via n8n Action
                                    </>
                                )}
                            </button>
                        )}

                        <button
                            onClick={handleComposeGmail}
                            className="w-full sm:flex-1 py-3 bg-gradient-to-r from-[#21D89A] to-[#047857] hover:opacity-95 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#21D89A]/15 active:scale-95"
                        >
                            <Send size={13} /> Compose in Gmail
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
};
