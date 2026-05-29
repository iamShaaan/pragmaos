import React from 'react';
import {
    User, Globe, Building2,
    Zap, Clock, CheckCircle2, Camera, FileSignature, Save, Loader2,
    Edit3, Mail, ExternalLink, X, Plus, Layout, Trash2
} from 'lucide-react';
import type { UserProfile, Routine, DailyLog } from '../types';
import { ChecklistHeatmap } from '../components/profile/ChecklistHeatmap';

// Safe URL hostname extractor - never throws
const getHostname = (url: string): string => {
    try {
        const u = url.startsWith('http') ? url : `https://${url}`;
        return new URL(u).hostname;
    } catch {
        return url || 'None linked';
    }
};

// ─── Prop Types ──────────────────────────────────────────────────────────────
interface Stats {
    score: number;
    timeDelivered: number;
    completionRate: number;
    activeProjects: number;
}

interface DashboardViewProps {
    profile: Partial<UserProfile>;
    stats: Stats;
    onEdit: () => void;
    routines: Routine[];
    dailyLogs: DailyLog[];
}

interface EditViewProps {
    profile: Partial<UserProfile>;
    setProfile: React.Dispatch<React.SetStateAction<Partial<UserProfile>>>;
    newPortfolioUrl: string;
    setNewPortfolioUrl: React.Dispatch<React.SetStateAction<string>>;
    saving: boolean;
    onSave: () => void;
    onDiscard: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature') => void;
    onAddPortfolio: () => void;
    onRemovePortfolio: (url: string) => void;
}

// ─── Dashboard View (STABLE TOP-LEVEL COMPONENT) ─────────────────────────────
export const DashboardView: React.FC<DashboardViewProps> = ({ profile, stats, onEdit, routines, dailyLogs }) => (
    <div className="space-y-8">
        {/* Header / Hero Section — Full Width */}
        <div className="bg-gradient-to-br from-white to-[#F0FFF8] dark:from-[#15221C] dark:to-[#111D17] border border-[#DDE8E2] dark:border-[#22372D] rounded-[28px] p-8 md:p-12 relative overflow-hidden group shadow-sm">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.05] scale-150 rotate-12 transition-transform group-hover:scale-125 duration-1000">
                <Zap size={250} className="text-[#047857] dark:text-[#21D89A]" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-10">
                <div className="relative">
                    <div className="w-40 h-40 rounded-[24px] bg-[#F3F7F5] dark:bg-[#0D1612] border-4 border-white dark:border-[#22372D] overflow-hidden shadow-md relative">
                        {profile.photoURL ? (
                            <img src={profile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[#6B7C73] bg-[#E7EEE9] dark:bg-[#1A2B23]">
                                <User size={64} />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 text-center md:text-left space-y-4 pt-2">
                    <div>
                        <h1 className="text-4xl font-black text-text-main tracking-tight mb-1">{profile.displayName || 'No Name Set'}</h1>
                        <p className="text-[#047857] dark:text-[#21D89A] font-bold tracking-wide uppercase text-xs flex items-center justify-center md:justify-start gap-2">
                            <Building2 size={12} /> {profile.companyName || 'TaskMaster Ecosystem'}
                        </p>
                    </div>

                    {/* ─── User Code ─────────────────── */}
                    <div className="inline-flex items-center gap-4 bg-[#DDFBF0] dark:bg-[#21D89A]/10 border border-[#B7F3DD] dark:border-[#21D89A]/30 rounded-2xl px-5 py-3">
                        <div className="space-y-0.5">
                            <p className="text-[#047857] dark:text-[#21D89A] text-[9px] font-black uppercase tracking-[0.2em]">Your User Code</p>
                            <p className="text-text-main font-black text-2xl tracking-widest font-mono">
                                {profile.user_code || `TM-${''}`}
                            </p>
                            <p className="text-text-muted text-[9px]">Share this to be added to team projects</p>
                        </div>
                        <button
                            onClick={() => {
                                if (profile.user_code) {
                                    navigator.clipboard.writeText(profile.user_code);
                                }
                            }}
                            className="p-2 bg-[#21D89A]/20 hover:bg-[#21D89A]/30 dark:bg-[#21D89A]/20 dark:hover:bg-[#21D89A]/30 rounded-xl text-[#047857] dark:text-[#21D89A] transition-all"
                            title="Copy code"
                        >
                            <ExternalLink size={16} />
                        </button>
                    </div>

                    <p className="text-text-muted text-sm leading-relaxed max-w-xl line-clamp-2 italic">
                        "{profile.bio || 'Your bio will appear here. Tell us about yourself...'}"
                    </p>

                    <div className="flex flex-wrap justify-center md:justify-start gap-3">
                        <div className="bg-bg-card border border-border-card px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
                            <div className="p-1.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-lg"><Clock size={16} className="text-amber-500" /></div>
                            <span className="text-text-main font-black">{stats.timeDelivered}h <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest ml-1">Tracked All-Time</span></span>
                        </div>
                        <div className="bg-bg-card border border-border-card px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
                            <div className="p-1.5 bg-emerald-500/10 dark:bg-[#DDFBF0]/10 rounded-lg"><CheckCircle2 size={16} className="text-[#047857] dark:text-[#21D89A]" /></div>
                            <span className="text-text-main font-black">{stats.completionRate}% <span className="text-text-muted text-[10px] font-bold uppercase tracking-widest ml-1">Done</span></span>
                        </div>
                        {(profile.websites || []).map((url, i) => (
                            <a key={i} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                                className="bg-[#DDFBF0]/50 hover:bg-[#DDFBF0] dark:bg-[#21D89A]/10 dark:hover:bg-[#21D89A]/20 border border-[#B7F3DD] dark:border-[#21D89A]/30 px-5 py-2.5 rounded-2xl flex items-center gap-3 transition-all group shadow-sm">
                                <Globe size={16} className="text-[#047857] dark:text-[#21D89A] group-hover:rotate-12 transition-transform" />
                                <span className="text-[#047857] dark:text-[#21D89A] font-bold text-xs uppercase tracking-widest">{getHostname(url)}</span>
                            </a>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onEdit}
                    className="bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm active:scale-95"
                >
                    <Edit3 size={18} /> Edit Profile
                </button>
            </div>

            <div className="mt-12 space-y-4">
                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <span className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em]">Live Performance Index</span>
                        <h3 className="text-text-main font-bold text-lg">Daily Productivity Level</h3>
                    </div>
                    <div className="text-right">
                        <span className="text-5xl font-black text-[#047857] dark:text-[#21D89A]">{stats.score}</span>
                        <span className="text-text-muted text-xl font-bold">/100</span>
                    </div>
                </div>
                <div className="h-4 bg-[#E7EEE9] dark:bg-[#0D1612] rounded-full border border-[#DDE8E2] dark:border-[#22372D] overflow-hidden p-1 shadow-inner">
                    <div
                        className="h-full bg-gradient-to-r from-[#21D89A] to-[#047857] rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${stats.score}%` }}
                    />
                </div>
            </div>
        </div>

        {/* Checklist Activity Heatmap */}
        <ChecklistHeatmap routines={routines} dailyLogs={dailyLogs} />

        {/* Bottom Row: Signature & Company Info — Side by Side */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Digital Signature */}
            <div className="bg-bg-card border border-border-card rounded-[22px] p-8 flex flex-col hover:border-[#21D89A]/50 dark:hover:border-[#21D89A]/30 transition-all duration-300 shadow-sm">
                <h2 className="text-text-main font-black mb-6 flex items-center gap-3 text-lg">
                    <div className="p-2 bg-[#DDFBF0] dark:bg-[#21D89A]/10 rounded-xl"><FileSignature size={20} className="text-[#047857] dark:text-[#21D89A]" /></div>
                    Digital Signature
                </h2>
                <div className="bg-[#F3F7F5] dark:bg-[#0D1612] border-2 border-dashed border-border-card dark:border-[#22372D] rounded-2xl flex items-center justify-center p-6 mb-4 group transition-colors hover:border-[#21D89A]/40 max-h-[200px]">
                    {profile.signatureURL ? (
                        <img src={profile.signatureURL} alt="Signature" className="max-h-full max-w-full object-contain dark:invert" />
                    ) : (
                        <div className="text-center space-y-3 opacity-30">
                            <FileSignature size={48} className="mx-auto text-text-muted" />
                            <p className="text-xs text-text-muted font-medium">No signature configured</p>
                        </div>
                    )}
                </div>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest text-center leading-relaxed italic mt-auto">
                    Used automatically for professional <br />invoice &amp; report exports.
                </p>
            </div>

            {/* Company & Details */}
            <div className="bg-bg-card border border-border-card rounded-[22px] p-8 space-y-8 flex flex-col hover:border-[#21D89A]/50 dark:hover:border-[#21D89A]/30 transition-all duration-300 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-[#DDFBF0] dark:bg-[#21D89A]/10 rounded-xl"><Building2 size={24} className="text-[#047857] dark:text-[#21D89A]" /></div>
                    <div>
                        <h2 className="text-text-main text-xl font-black">Organization Details</h2>
                        <p className="text-text-muted text-xs font-bold uppercase tracking-widest">Client facing assets</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-4">
                        <h3 className="text-text-main text-sm font-black flex items-center gap-2">
                            <Layout size={16} className="text-[#047857] dark:text-[#21D89A]" /> Company Bio
                        </h3>
                        <div className="bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[18px] p-6 min-h-[100px]">
                            <p className="text-text-muted text-sm leading-relaxed whitespace-pre-wrap">
                                {profile.companyDescription || "No organizational biography has been provided yet. Edit your profile to add your team's mission and agency details."}
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border-card dark:border-[#22372D]">
                        <div className="space-y-2">
                            <span className="text-text-muted text-[10px] font-black uppercase tracking-widest block">Primary Point of Contact</span>
                            <div className="flex items-center gap-3 text-text-main font-bold bg-[#F3F7F5] dark:bg-[#0D1612] p-3 rounded-[12px] border border-border-card dark:border-[#22372D]">
                                <Mail size={14} className="text-text-muted" />
                                <span className="text-xs truncate">{profile.professionalEmail || profile.personalEmail || "Not specified"}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <span className="text-text-muted text-[10px] font-black uppercase tracking-widest block">Portfolio Nexus</span>
                            {(profile.websites && profile.websites.length > 0) ? (
                                <div className="space-y-2">
                                    {profile.websites.map((url, i) => (
                                        <a key={i} href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noopener noreferrer"
                                            className="flex items-center gap-3 text-text-main font-bold bg-[#F3F7F5] dark:bg-[#0D1612] p-3 rounded-[12px] border border-border-card dark:border-[#22372D] hover:border-[#21D89A] dark:hover:border-[#21D89A] transition-all group">
                                            <ExternalLink size={14} className="text-text-muted group-hover:text-[#047857] dark:group-hover:text-[#21D89A] transition-colors" />
                                            <span className="text-xs truncate group-hover:text-[#047857] dark:group-hover:text-[#21D89A] transition-colors">{getHostname(url)}</span>
                                        </a>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 text-text-muted font-bold bg-[#F3F7F5] dark:bg-[#0D1612] p-3 rounded-[12px] border border-border-card dark:border-[#22372D]">
                                    <ExternalLink size={14} className="text-text-muted" />
                                    <span className="text-xs text-text-muted">None linked</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

// ─── Edit View (STABLE TOP-LEVEL COMPONENT) ───────────────────────────────────
export const EditView: React.FC<EditViewProps> = ({
    profile, setProfile, newPortfolioUrl, setNewPortfolioUrl,
    saving, onSave, onDiscard, onFileUpload, onAddPortfolio, onRemovePortfolio
}) => (
    <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-black text-text-main">Edit Your Profile</h1>
                <p className="text-text-muted font-bold uppercase tracking-widest text-xs mt-1">Updates reflect across all client portals</p>
            </div>
            <div className="flex gap-3">
                <button
                    onClick={onDiscard}
                    className="px-6 py-3 rounded-xl text-text-muted hover:text-text-main font-bold transition-all"
                >
                    Discard
                </button>
                <button
                    onClick={onSave}
                    disabled={saving}
                    className="bg-[#21D89A] hover:bg-[#1ebd86] text-[#053B2A] px-8 py-3 rounded-xl font-bold flex items-center gap-2 active:scale-95 transition-all shadow-sm"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Save Dashboard</>}
                </button>
            </div>
        </div>

        <div className="space-y-8 pb-20">
            {/* Media Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-bg-card border border-border-card rounded-[22px] p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <Camera size={20} className="text-[#047857] dark:text-[#21D89A]" />
                        <h3 className="text-text-main font-bold">Profile Media</h3>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-xl bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] overflow-hidden relative">
                                {profile.photoURL ? (
                                    <>
                                        <img src={profile.photoURL} alt="p" className="w-full h-full object-cover" />
                                        <button
                                            onClick={(e) => { e.preventDefault(); setProfile(p => ({ ...p, photoURL: '' })); }}
                                            className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                            title="Remove Avatar"
                                        >
                                            <Trash2 size={12} className="text-white" />
                                        </button>
                                    </>
                                ) : <div className="w-full h-full flex items-center justify-center text-text-muted"><User size={32} /></div>}
                            </div>
                            <label className="absolute -bottom-1 -right-1 p-2 bg-[#21D89A] text-[#053B2A] rounded-lg cursor-pointer hover:bg-[#1ebd86] transition-all z-10 shadow-sm">
                                <Camera size={14} className="text-white" />
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => onFileUpload(e, 'photo')} />
                            </label>
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-text-main text-sm font-bold">Display Avatar</p>
                            <p className="text-text-muted text-xs leading-relaxed">Recommended 400x400px squared image for best dashboard optics.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-bg-card border border-border-card rounded-[22px] p-8 space-y-6 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                        <FileSignature size={20} className="text-[#047857] dark:text-[#21D89A]" />
                        <h3 className="text-text-main font-bold">Agency Signature</h3>
                    </div>
                    <div className="flex items-center gap-6">
                        <div className="relative group">
                            <div className="w-24 h-24 rounded-xl bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] flex items-center justify-center overflow-hidden relative">
                                {profile.signatureURL ? (
                                    <>
                                        <img src={profile.signatureURL} alt="s" className="w-full h-full object-contain dark:invert" />
                                        <button
                                            onClick={(e) => { e.preventDefault(); setProfile(p => ({ ...p, signatureURL: '' })); }}
                                            className="absolute top-1 right-1 p-1 bg-red-500/80 rounded-lg hover:bg-red-500 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                            title="Remove Signature"
                                        >
                                            <Trash2 size={12} className="text-white" />
                                        </button>
                                    </>
                                ) : <div className="text-text-muted"><FileSignature size={32} /></div>}
                            </div>
                            <label className="absolute -bottom-1 -right-1 p-2 bg-[#21D89A] text-[#053B2A] rounded-lg cursor-pointer hover:bg-[#1ebd86] transition-all z-10 shadow-sm">
                                <Plus size={14} className="text-white" />
                                <input type="file" className="hidden" accept="image/png" onChange={(e) => onFileUpload(e, 'signature')} />
                            </label>
                        </div>
                        <div className="flex-1 space-y-1">
                            <p className="text-text-main text-sm font-bold">Professional PNG</p>
                            <p className="text-text-muted text-xs leading-relaxed">Ensure a transparent background for seamless export integration.</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Identity Form */}
            <div className="bg-bg-card border border-border-card rounded-[22px] p-8 space-y-8 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Platform Display Name</label>
                        <input
                            className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-4 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                            value={profile.displayName || ''}
                            onChange={(e) => setProfile(p => ({ ...p, displayName: e.target.value }))}
                            placeholder="Display Name"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Legal Full Name</label>
                        <input
                            className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-4 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                            value={profile.fullName || ''}
                            onChange={(e) => setProfile(p => ({ ...p, fullName: e.target.value }))}
                            placeholder="Soumitro Halder"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Business Email</label>
                        <input
                            className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-[#DDE8E2] dark:border-[#22372D] rounded-[14px] px-5 py-4 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                            value={profile.professionalEmail || ''}
                            onChange={(e) => setProfile(p => ({ ...p, professionalEmail: e.target.value }))}
                            placeholder="billing@agency.com"
                        />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Portfolio &amp; Links</label>
                        <div className="flex gap-3">
                            <div className="relative flex-1">
                                <Globe size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
                                <input
                                    className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-[#DDE8E2] dark:border-[#22372D] rounded-[14px] px-5 py-4 pl-12 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                                    value={newPortfolioUrl}
                                    onChange={(e) => setNewPortfolioUrl(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onAddPortfolio())}
                                    placeholder="https://linkedin.com/in/yourname"
                                />
                            </div>
                            <button
                                onClick={onAddPortfolio}
                                className="bg-[#047857] hover:bg-[#035e43] dark:bg-[#21D89A] dark:hover:bg-[#1ebd86] text-white dark:text-[#053B2A] px-8 rounded-xl font-bold transition-all shadow-sm"
                            >
                                Add
                            </button>
                        </div>
                        {(profile.websites || []).length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {(profile.websites || []).map((url, i) => (
                                    <div key={i} className="flex items-center gap-2 bg-[#EEF7F2] dark:bg-[#1A2B23] border border-[#DDE8E2] dark:border-[#22372D] px-4 py-2 rounded-xl group shadow-sm">
                                        <Globe size={12} className="text-[#047857] dark:text-[#21D89A]" />
                                        <span className="text-text-main text-xs font-bold max-w-[200px] truncate">{getHostname(url)}</span>
                                        <button onClick={() => onRemovePortfolio(url)} className="text-text-muted hover:text-red-500 transition-colors ml-1">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Personal Biography</label>
                    <textarea
                        className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[18px] px-6 py-5 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-medium resize-none"
                        rows={4}
                        value={profile.bio || ''}
                        onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                        placeholder="Tell your story..."
                    />
                </div>
            </div>

            {/* Company Form */}
            <div className="bg-bg-card border border-border-card rounded-[22px] p-8 space-y-8 shadow-sm">
                <div className="space-y-6">
                    <div className="space-y-3">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Organization Name</label>
                        <input
                            className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[14px] px-5 py-4 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-bold"
                            value={profile.companyName || ''}
                            onChange={(e) => setProfile(p => ({ ...p, companyName: e.target.value }))}
                            placeholder="Agency X"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] ml-1">Agency Overview / Mission</label>
                        <textarea
                            className="w-full bg-[#F3F7F5] dark:bg-[#0D1612] border border-border-card dark:border-[#22372D] rounded-[18px] px-6 py-5 text-text-main placeholder-text-muted/40 focus:border-[#21D89A] focus:ring-1 focus:ring-[#21D89A] outline-none transition-all font-medium resize-none"
                            rows={3}
                            value={profile.companyDescription || ''}
                            onChange={(e) => setProfile(p => ({ ...p, companyDescription: e.target.value }))}
                            placeholder="Vision, mission, and focus..."
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
);
