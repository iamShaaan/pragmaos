import React, { useState, useEffect } from 'react';
import { db, APP_ID } from '../firebase/config';
import { doc, setDoc, collection, getDocs } from 'firebase/firestore';
import { Users, Mail, X, UserPlus, Hash, User as UserIcon, ShieldAlert, Crown, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import type { UserProfile } from '../types';
import { useOutletContext } from 'react-router-dom';

interface OutletContextType {
    profile: Partial<UserProfile>;
    setProfile: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
}

export const TeamMembers: React.FC = () => {
    const { profile, setProfile } = useOutletContext<OutletContextType>();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [userCode, setUserCode] = useState('');
    const [whatsappNumber, setWhatsappNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [leaders, setLeaders] = useState<UserProfile[]>([]);
    const [loadingLeaders, setLoadingLeaders] = useState(true);

    useEffect(() => {
        const fetchLeaders = async () => {
            if (!profile.uid) return;
            try {
                const snap = await getDocs(collection(db, `apps/${APP_ID}/users`));
                const emails = [profile.personalEmail?.toLowerCase(), profile.professionalEmail?.toLowerCase()].filter(Boolean);
                const code = profile.user_code;

                const foundLeaders = snap.docs.map(d => ({ ...d.data(), uid: d.id } as UserProfile))
                    .filter(u => u.uid !== profile.uid && u.teamMembers?.some(m =>
                        (m.email && emails.includes(m.email.toLowerCase())) ||
                        (m.user_code && m.user_code === code)
                    ));

                setLeaders(foundLeaders);
            } catch (err) {
                console.error('Error fetching leaders:', err);
            } finally {
                setLoadingLeaders(false);
            }
        };
        fetchLeaders();
    }, [profile]);

    const resetForm = () => {
        setName('');
        setEmail('');
        setUserCode('');
        setWhatsappNumber('');
        setShowForm(false);
        setEditingIdx(null);
    };

    const saveTeamMember = async () => {
        if (!name.trim() && !email.trim() && !userCode.trim() && !whatsappNumber.trim()) {
            toast.error('Please fill in at least one field');
            return;
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedCode = userCode.trim().toUpperCase();
        const trimmedName = name.trim();
        const trimmedWhatsapp = whatsappNumber.trim();

        // Duplicate check (exclude current if editing)
        const isDuplicate = profile.teamMembers?.some((m, idx) => {
            if (editingIdx === idx) return false;
            return (trimmedEmail && m.email?.toLowerCase() === trimmedEmail) ||
                (trimmedCode && m.user_code === trimmedCode);
        });

        if (isDuplicate) {
            toast.error('This member matching this email or code already exists');
            return;
        }

        // Self check
        if (trimmedCode && trimmedCode === profile.user_code) {
            toast.error("You cannot add yourself");
            return;
        }

        setSaving(true);
        try {
            const memberData = {
                name: trimmedName,
                email: trimmedEmail,
                user_code: trimmedCode,
                whatsappNumber: trimmedWhatsapp,
            };

            let newMembers = [...(profile.teamMembers || [])];
            if (editingIdx !== null) {
                newMembers[editingIdx] = memberData;
            } else {
                newMembers.push(memberData);
            }

            if (profile.uid) {
                await setDoc(doc(db, `apps/${APP_ID}/users`, profile.uid), {
                    teamMembers: newMembers
                }, { merge: true });
            }

            setProfile(p => ({ ...p, teamMembers: newMembers }));
            resetForm();
            toast.success(editingIdx !== null ? 'Member updated!' : 'Team member added!');
        } catch (e) {
            toast.error('Failed to save member');
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (idx: number) => {
        const member = (profile.teamMembers || [])[idx];
        if (!member) return;
        setName(member.name || '');
        setEmail(member.email || '');
        setUserCode(member.user_code || '');
        setWhatsappNumber(member.whatsappNumber || '');
        setEditingIdx(idx);
        setShowForm(true);
    };

    const removeTeamMember = async (idx: number) => {
        const newMembers = [...(profile.teamMembers || [])];
        newMembers.splice(idx, 1);

        if (profile.uid) {
            try {
                await setDoc(doc(db, `apps/${APP_ID}/users`, profile.uid), {
                    teamMembers: newMembers
                }, { merge: true });
            } catch (e) {
                console.error(e);
                toast.error('Failed to remove member');
                return;
            }
        }

        setProfile(p => ({ ...p, teamMembers: newMembers }));
        toast.success('Member removed');
    };

    return (
        <div className="bg-bg-card border border-border-card rounded-[28px] p-8 sm:p-10 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-text-main text-xl font-black flex items-center gap-3">
                        <div className="p-2.5 bg-[#DDFBF0] dark:bg-[#21D89A]/10 rounded-xl border border-[#B7F3DD] dark:border-[#21D89A]/20 shadow-sm"><Users size={20} className="text-[#047857] dark:text-[#21D89A]" /></div>
                        Team Directory
                    </h2>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest mt-2">Manage your team members</p>
                </div>
                <button
                    onClick={() => { if (showForm) resetForm(); else setShowForm(true); }}
                    className="bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] px-6 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 flex items-center gap-2 text-sm cursor-pointer"
                >
                    <UserPlus size={16} />
                    {showForm ? 'Cancel' : 'Add Member'}
                </button>
            </div>

            {/* Add Member Form */}
            {showForm && (
                <div className="bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[22px] p-6 space-y-4 animate-in fade-in slide-in-from-top-2 shadow-sm">
                    <h3 className="text-text-main font-bold text-sm flex items-center gap-2">
                        <UserPlus size={14} className="text-[#047857] dark:text-[#21D89A]" />
                        {editingIdx !== null ? 'Edit Team Member' : 'Add New Team Member'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                            <UserIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                className="w-full bg-bg-card border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-3.5 pl-11 text-text-main outline-none focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] transition-all text-sm font-medium shadow-sm"
                                placeholder="Full Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Mail size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                className="w-full bg-bg-card border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-3.5 pl-11 text-text-main outline-none focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] transition-all text-sm font-medium shadow-sm"
                                placeholder="Email Address"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <Hash size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                className="w-full bg-bg-card border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-3.5 pl-11 text-text-main outline-none focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] transition-all text-sm font-medium uppercase shadow-sm"
                                placeholder="User ID (e.g. TM-A3X9P2)"
                                value={userCode}
                                onChange={(e) => setUserCode(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTeamMember(); } }}
                            />
                        </div>
                        <div className="relative">
                            <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                            <input
                                className="w-full bg-bg-card border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-3.5 pl-11 text-text-main outline-none focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] transition-all text-sm font-medium shadow-sm"
                                placeholder="WhatsApp (+1...)"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveTeamMember(); } }}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            onClick={saveTeamMember}
                            disabled={saving || (!name.trim() && !email.trim() && !userCode.trim() && !whatsappNumber.trim())}
                            className="bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] px-8 py-3 rounded-xl font-bold transition-all shadow-sm active:scale-95 text-sm flex items-center gap-2 cursor-pointer disabled:opacity-40"
                        >
                            {saving ? 'Saving...' : (editingIdx !== null ? 'Update Member' : 'Save Member')}
                        </button>
                    </div>
                </div>
            )}

            {/* Member List */}
            <div className="space-y-3">
                {(!profile.teamMembers || profile.teamMembers.length === 0) ? (
                    <div className="flex flex-col items-center justify-center text-center py-12 border-2 border-dashed border-border-card dark:border-[#22372D] rounded-[22px] bg-[#F3F7F5]/30">
                        <Users size={32} className="mb-2 text-text-muted/40" />
                        <p className="text-xs font-bold text-text-main">No team members added yet.</p>
                        <p className="text-[10px] text-text-muted mt-1">Click "Add Member" to get started</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {profile.teamMembers.map((member, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-bg-card p-4 rounded-xl border border-border-card dark:border-[#22372D] group hover:border-[#21D89A]/50 dark:hover:border-[#21D89A]/30 transition-all shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-[#DDFBF0] dark:bg-[#21D89A]/10 flex items-center justify-center text-[#047857] dark:text-[#21D89A] font-black border border-[#B7F3DD] dark:border-[#21D89A]/20 shadow-sm">
                                        {(member.name || member.email || '?').charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-text-main text-sm font-bold truncate max-w-[200px]">
                                            {member.name || member.email || member.user_code || 'Unnamed'}
                                        </p>
                                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                            {member.email && (
                                                <span className="text-text-muted text-[10px] font-medium truncate max-w-[150px]">
                                                    {member.email}
                                                </span>
                                            )}
                                            {member.email && member.user_code && (
                                                <span className="text-text-muted/30 text-[10px]">·</span>
                                            )}
                                            {member.user_code && (
                                                <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest bg-[#F3F7F5] dark:bg-[#1A2B23]/40 border border-[#DDE8E2] dark:border-[#22372D]/30 px-1.5 py-0.5 rounded">
                                                    {member.user_code}
                                                </span>
                                            )}
                                            {member.whatsappNumber && (
                                                <span className="text-text-muted/30 text-[10px]">·</span>
                                            )}
                                            {member.whatsappNumber && (
                                                <span className="text-[#047857] dark:text-[#21D89A] text-[10px] font-bold flex items-center gap-1">
                                                    <Phone size={10} /> {member.whatsappNumber}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleEdit(idx)}
                                        className="p-2 bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] rounded-xl text-text-muted hover:text-[#047857] dark:hover:text-[#21D89A] hover:bg-[#EEF7F2] dark:hover:bg-[#1A2B23] transition-all shadow-sm cursor-pointer"
                                        title="Edit member"
                                    >
                                        <Users size={16} />
                                    </button>
                                    <button
                                        onClick={() => removeTeamMember(idx)}
                                        className="p-2 bg-[#F3F7F5] dark:bg-[#15221C] border border-[#DDE8E2] dark:border-[#22372D] rounded-xl text-text-muted hover:text-rose-500 hover:bg-[#FFE4E8] dark:hover:bg-rose-950/30 transition-all shadow-sm cursor-pointer"
                                        title="Remove member"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* My Leaders Section */}
            <div className="pt-8 border-t border-border-card dark:border-[#22372D] mt-8 space-y-4">
                <div>
                    <h3 className="text-text-main text-lg font-black flex items-center gap-2 mb-1">
                        <Crown size={18} className="text-amber-500" /> My Leaders
                    </h3>
                    <p className="text-text-muted text-xs font-bold uppercase tracking-widest">
                        People who have added you to their team
                    </p>
                </div>

                {loadingLeaders ? (
                    <div className="text-text-muted text-sm animate-pulse">Loading leaders...</div>
                ) : leaders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-8 border-2 border-dashed border-border-card dark:border-[#22372D] rounded-[22px] bg-[#F3F7F5]/30">
                        <ShieldAlert size={28} className="mb-2 text-text-muted/40" />
                        <p className="text-xs font-bold text-text-muted">You haven't been added to anyone's team.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {leaders.map(leader => (
                            <div key={leader.uid} className="flex items-center gap-4 bg-bg-card p-4 rounded-xl border border-border-card dark:border-[#22372D] hover:border-amber-500 dark:hover:border-amber-400/50 transition-all shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-black border border-amber-500/20 shadow-sm">
                                    {(leader.displayName || leader.companyName || '?').charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-text-main text-sm font-bold truncate max-w-[200px]">
                                        {leader.displayName || leader.fullName || 'Unnamed User'}
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        {(leader.professionalEmail || leader.personalEmail) && (
                                            <span className="text-text-muted text-[10px] font-medium truncate max-w-[150px]">
                                                {leader.professionalEmail || leader.personalEmail}
                                            </span>
                                        )}
                                        {leader.user_code && (
                                            <span className="text-amber-800 dark:text-amber-400 text-[10px] font-bold uppercase tracking-widest bg-[#FEF3C7] dark:bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-transparent dark:border-amber-500/20 shadow-sm">
                                                {leader.user_code}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
