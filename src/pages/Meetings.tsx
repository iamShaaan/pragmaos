import React, { useState } from 'react';
import { Plus, Calendar, Clock, Users, Link2, Pencil, Trash2, CheckCircle2, XCircle, StopCircle, Mail } from 'lucide-react';
import { useAppStore } from '../store';
import { MeetingForm } from '../components/meetings/MeetingForm';
import { Modal } from '../components/ui/Modal';
import { EmailPreviewModal } from '../components/ui/EmailPreviewModal';
import type { Meeting } from '../types';
import { deleteDocById, updateDocById } from '../firebase/firestore';
import { formatDateTime, formatTime } from '../utils/timeFormat';
import { triggerN8n } from '../utils/n8nBridge';
import toast from 'react-hot-toast';

// ─── Outcome config ───
type Outcome = Meeting['outcome'];

const OUTCOMES: { value: Outcome; label: string; icon: React.ElementType; active: string; ring: string }[] = [
    {
        value: 'ended',
        label: 'Ended',
        icon: StopCircle,
        active: 'bg-[#F3F7F5] text-[#6B7C73] border-[#DDE8E2]',
        ring: 'border-border-card',
    },
    {
        value: 'success',
        label: 'Success',
        icon: CheckCircle2,
        active: 'bg-[#DDFBF0] text-[#047857] border-[#B7F3DD]/60',
        ring: 'border-[#B7F3DD]/40',
    },
    {
        value: 'failed',
        label: 'Failed',
        icon: XCircle,
        active: 'bg-[#FFE4E8] text-[#BE123C] border-transparent',
        ring: 'border-[#FECDD3]/40',
    },
];

// ─── Outcome Badge ───
const OutcomeBadge = ({ outcome }: { outcome: Outcome }) => {
    if (!outcome) return null;
    const cfg = OUTCOMES.find(o => o.value === outcome)!;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.active}`}>
            <Icon size={10} />
            {cfg.label}
        </span>
    );
};

// ─── Status Bar (interactive chips) ───
const OutcomeBar = ({ meeting }: { meeting: Meeting }) => {
    const [saving, setSaving] = useState<Outcome | null>(null);

    const setOutcome = async (value: Outcome) => {
        if (saving) return;
        const newVal = meeting.outcome === value ? undefined : value;
        setSaving(value);
        try {
            await updateDocById('meetings', meeting.id, { outcome: newVal ?? null });
            toast.success(newVal ? `Marked as ${newVal}` : 'Outcome cleared');
        } catch {
            toast.error('Failed to update outcome');
        } finally {
            setSaving(null);
        }
    };

    return (
        <div className="mt-4 pt-3 border-t border-border-card">
            <p className="text-text-muted text-[10px] font-bold uppercase tracking-wider mb-2">Meeting Outcome</p>
            <div className="flex gap-2">
                {OUTCOMES.map(({ value, label, icon: Icon, active, ring }) => {
                    const isActive = meeting.outcome === value;
                    const isLoading = saving === value;
                    return (
                        <button
                            key={value}
                            onClick={() => setOutcome(value)}
                            disabled={!!saving}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all active:scale-95 disabled:opacity-60 cursor-pointer ${isActive
                                    ? active
                                    : `bg-bg-input text-text-muted border-border-input hover:${ring} hover:text-text-main`
                                }`}
                        >
                            {isLoading ? (
                                <span className="w-3 h-3 rounded-full border-2 border-current border-t-transparent animate-spin" />
                            ) : (
                                <Icon size={12} />
                            )}
                            {label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

// ─── Meeting Card ───
const MeetingCard = ({
    meeting,
    now,
    onEdit,
    onDelete,
    onSendEmail,
}: {
    meeting: Meeting;
    now: Date;
    onEdit: (m: Meeting) => void;
    onDelete: (id: string) => void;
    onSendEmail: (m: Meeting) => void;
}) => {
    const isUpcoming = meeting.start_time > now;
    const durationMs = meeting.end_time.getTime() - meeting.start_time.getTime();
    const durationMin = Math.round(durationMs / 60000);

    // Left border indicator matches outcome or upcoming status
    const borderLeftCls = isUpcoming
        ? 'border-l-4 border-l-[#21D89A]'
        : meeting.outcome === 'success'
            ? 'border-l-4 border-l-[#21D89A]'
            : meeting.outcome === 'failed'
                ? 'border-l-4 border-l-[#EF476F]'
                : 'border-l-4 border-l-text-muted/40';

    return (
        <div className={`group bg-white dark:bg-bg-card border border-border-card ${borderLeftCls} rounded-[18px] p-6 shadow-[0_4px_16px_rgba(16,35,27,0.03)] hover:shadow-[0_8px_24px_rgba(16,35,27,0.05)] transition-all ${!isUpcoming ? 'opacity-85 hover:opacity-100' : ''}`}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${isUpcoming ? 'bg-[#DDFBF0]' :
                            meeting.outcome === 'success' ? 'bg-[#DDFBF0]' :
                                meeting.outcome === 'failed' ? 'bg-[#FFE4E8]' :
                                    'bg-bg-input'
                        }`}>
                        <Calendar size={15} className={
                            isUpcoming ? 'text-[#047857]' :
                                meeting.outcome === 'success' ? 'text-[#047857]' :
                                    meeting.outcome === 'failed' ? 'text-[#BE123C]' :
                                        'text-text-muted'
                        } />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-text-main font-bold text-sm">{meeting.title}</h3>
                            {isUpcoming && (
                                <span className="text-[9px] font-bold uppercase tracking-wider text-[#047857] bg-[#DDFBF0] border border-[#B7F3DD] px-1.5 py-0.5 rounded-full">
                                    UPCOMING
                                </span>
                            )}
                            {!isUpcoming && <OutcomeBadge outcome={meeting.outcome} />}
                        </div>
                        {meeting.description && (
                            <p className="text-text-muted text-xs mt-1 line-clamp-1">{meeting.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => onSendEmail(meeting)} className={`p-1.5 rounded-lg text-text-muted hover:text-[#21D89A] hover:bg-[#21D89A]/10 transition-all cursor-pointer ${meeting.invitation_sent ? 'text-[#21D89A] bg-[#21D89A]/10' : ''}`} title="Send Invitation via Gmail">
                        <Mail size={13} />
                    </button>
                    <button onClick={() => onEdit(meeting)} className="p-1.5 rounded-lg text-text-muted hover:text-[#047857] hover:bg-[#DDFBF0] transition-all cursor-pointer">
                        <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(meeting.id)} className="p-1.5 rounded-lg text-text-muted hover:text-[#BE123C] hover:bg-[#FFE4E8] transition-all cursor-pointer">
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                <div className="flex items-center gap-1.5 text-xs text-text-muted">
                    <Clock size={11} />
                    <span>{formatTime(meeting.start_time)} – {formatTime(meeting.end_time)} ({durationMin}min)</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-muted/80">
                    <Calendar size={11} />
                    <span>{formatDateTime(meeting.start_time)}</span>
                </div>
                {meeting.location && (
                    <div className="flex items-center gap-1.5 text-xs">
                        <Link2 size={11} className="text-[#047857] flex-shrink-0" />
                        <a
                            href={meeting.location.startsWith('http') ? meeting.location : `https://${meeting.location}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#047857] hover:underline underline-offset-2 truncate transition-colors"
                        >
                            Meeting Link
                        </a>
                    </div>
                )}
                {meeting.participants?.length > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-text-muted/80">
                        <Users size={11} />
                        <span>
                            {meeting.participants.slice(0, 2).join(', ')}
                            {meeting.participants.length > 2 ? ` +${meeting.participants.length - 2}` : ''}
                        </span>
                    </div>
                )}
                {meeting.invitation_sent && (
                    <div className="flex items-center gap-1.5 text-xs text-[#21D89A] font-bold">
                        <Mail size={11} />
                        <span>Invite Sent</span>
                    </div>
                )}
            </div>

            {/* Status bar */}
            {!isUpcoming && <OutcomeBar meeting={meeting} />}
        </div>
    );
};

// ─── Page ───
export const Meetings: React.FC = () => {
    const { meetings, clients } = useAppStore();
    const [showForm, setShowForm] = useState(false);
    const [editMeeting, setEditMeeting] = useState<Meeting | undefined>();
    
    // Email preview modal state
    const [selectedEmailMeeting, setSelectedEmailMeeting] = useState<Meeting | undefined>();
    const [emailPreviewOpen, setEmailPreviewOpen] = useState(false);
    const [emailPreviewData, setEmailPreviewData] = useState({ to: '', subject: '', body: '' });

    const now = new Date();

    const upcoming = meetings
        .filter(m => m.start_time > now)
        .sort((a, b) => a.start_time.getTime() - b.start_time.getTime());

    const past = meetings
        .filter(m => m.start_time <= now)
        .sort((a, b) => b.start_time.getTime() - a.start_time.getTime());

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this meeting? It can be restored from Archive within 30 days.')) return;
        await deleteDocById('meetings', id);
        toast.success('Meeting moved to Archive');
    };

    const openEdit = (m: Meeting) => { setEditMeeting(m); setShowForm(true); };
    const closeForm = () => { setEditMeeting(undefined); setShowForm(false); };

    // Summary counts for header bar
    const successCount = past.filter(m => m.outcome === 'success').length;
    const failedCount = past.filter(m => m.outcome === 'failed').length;
    const pendingCount = past.filter(m => !m.outcome).length;

    const handleOpenEmailPreview = (m: Meeting) => {
        setSelectedEmailMeeting(m);
        
        // Find linked client's emails if exists
        const linkedClient = m.linked_client_id ? clients.find(c => c.id === m.linked_client_id) : null;
        const clientEmails = linkedClient?.emails || [];
        
        // Combine client and participant emails
        const recipients = Array.from(new Set([...m.participants, ...clientEmails])).join(', ');
        
        const durationMin = Math.round((m.end_time.getTime() - m.start_time.getTime()) / 60000);
        const formattedDate = formatDateTime(m.start_time);
        
        const subject = `Meeting Invitation: ${m.title}`;
        const body = `Hello,

You are invited to a meeting. Here are the details:

Event: ${m.title}
Date & Time: ${formattedDate}
Duration: ${durationMin} minutes
${m.location ? `Meeting Link / Location: ${m.location}` : ''}

Description:
${m.description || 'No description provided.'}

I look forward to our conversation.

Best regards,`;
        
        setEmailPreviewData({ to: recipients, subject, body });
        setEmailPreviewOpen(true);
    };

    const handleTriggerAutomation = async (data: { to: string; subject: string; body: string }) => {
        if (!selectedEmailMeeting) return;
        await triggerN8n('send_meeting_invitation', {
            meeting_id: selectedEmailMeeting.id,
            email: data.to,
            title: data.subject,
            body: data.body,
            time: selectedEmailMeeting.start_time.toISOString()
        });
    };

    const handleSentSuccess = async () => {
        if (!selectedEmailMeeting) return;
        try {
            await updateDocById('meetings', selectedEmailMeeting.id, { invitation_sent: true });
        } catch (err) {
            console.error('Failed to update meeting invite status:', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <p className="text-text-muted text-sm">
                        <span className="text-text-main font-bold">{upcoming.length}</span> upcoming
                    </p>
                    {past.length > 0 && (
                        <div className="flex items-center gap-2">
                            {successCount > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-[#047857] bg-[#DDFBF0] border border-[#B7F3DD] px-2.5 py-0.5 rounded-full">
                                    <CheckCircle2 size={10} /> {successCount} success
                                </span>
                            )}
                            {failedCount > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-[#BE123C] bg-[#FFE4E8] border border-transparent px-2.5 py-0.5 rounded-full">
                                    <XCircle size={10} /> {failedCount} failed
                                </span>
                            )}
                            {pendingCount > 0 && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-[#6B7C73] bg-[#F3F7F5] border border-transparent px-2.5 py-0.5 rounded-full">
                                    <StopCircle size={10} /> {pendingCount} no outcome
                                </span>
                            )}
                        </div>
                    )}
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-glitch-emerald text-[#053B2A] text-sm font-bold rounded-xl transition-all shadow-[0_8px_20px_rgba(33,216,154,0.2)] hover:opacity-95 active:scale-95 cursor-pointer"
                >
                    <Plus size={16} /> Schedule Meeting
                </button>
            </div>

            {/* Vertical Timeline container */}
            <div className="relative pl-6 sm:pl-8 border-l-2 border-border-card space-y-8 ml-3 py-2">
                {/* Upcoming Title Dot & Indicator */}
                {upcoming.length > 0 && (
                    <div className="relative">
                        <span className="absolute -left-[30px] sm:-left-[38px] top-1 w-3 h-3 rounded-full border-2 border-bg-app bg-[#21D89A]" />
                        <h2 className="text-[#047857] text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Clock size={12} className="text-[#21D89A]" /> Upcoming Meetings
                        </h2>
                        <div className="space-y-4">
                            {upcoming.map(m => (
                                <div key={m.id} className="relative">
                                    <span className="absolute -left-[30px] sm:-left-[38px] top-6 w-3 h-3 rounded-full border-2 border-bg-app bg-[#21D89A]" />
                                    <MeetingCard meeting={m} now={now} onEdit={openEdit} onDelete={handleDelete} onSendEmail={handleOpenEmailPreview} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Past Title Dot & Indicator */}
                {past.length > 0 && (
                    <div className="relative pt-2">
                        <span className="absolute -left-[30px] sm:-left-[38px] top-3 w-3 h-3 rounded-full border-2 border-bg-app bg-[#6B7C73]" />
                        <h2 className="text-text-muted text-xs font-black uppercase tracking-widest mb-3">Past Meetings</h2>
                        <div className="space-y-4">
                            {past.slice(0, 10).map(m => {
                                const dotBg = m.outcome === 'success' ? 'bg-[#21D89A]' : m.outcome === 'failed' ? 'bg-[#EF476F]' : 'bg-[#6B7C73]';
                                return (
                                    <div key={m.id} className="relative">
                                        <span className={`absolute -left-[30px] sm:-left-[38px] top-6 w-3 h-3 rounded-full border-2 border-bg-app ${dotBg}`} />
                                        <MeetingCard meeting={m} now={now} onEdit={openEdit} onDelete={handleDelete} onSendEmail={handleOpenEmailPreview} />
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Empty */}
            {meetings.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-bg-card border border-border-card rounded-[22px] p-8 shadow-sm">
                    <Calendar size={48} className="text-text-muted/40 mx-auto mb-3" />
                    <p className="text-text-muted">No meetings scheduled yet</p>
                    <button onClick={() => setShowForm(true)} className="mt-3 text-[#047857] hover:underline text-sm font-bold cursor-pointer">
                        Schedule your first meeting →
                    </button>
                </div>
            )}

            <Modal isOpen={showForm} onClose={closeForm} title={editMeeting ? 'Edit Meeting' : 'Schedule Meeting'} size="lg">
                <MeetingForm onClose={closeForm} editMeeting={editMeeting} />
            </Modal>

            <EmailPreviewModal
                isOpen={emailPreviewOpen}
                onClose={() => setEmailPreviewOpen(false)}
                title="Send Meeting Invitation"
                initialTo={emailPreviewData.to}
                initialSubject={emailPreviewData.subject}
                initialBody={emailPreviewData.body}
                onSentSuccess={handleSentSuccess}
                onTriggerAutomation={handleTriggerAutomation}
            />
        </div>
    );
};
