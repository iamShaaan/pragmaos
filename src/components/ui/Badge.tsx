import React from 'react';

interface BadgeProps {
    label: string;
    variant?: 'indigo' | 'emerald' | 'amber' | 'red' | 'slate' | 'purple';
    size?: 'sm' | 'md';
}

const variantMap = {
    indigo: 'bg-[#E0F2FE] text-[#0369A1] border-transparent',
    emerald: 'bg-[#DDFBF0] text-[#047857] border-[#B7F3DD]/40',
    amber: 'bg-[#FEF3C7] text-[#92400E] border-transparent',
    red: 'bg-[#FFE4E8] text-[#BE123C] border-transparent',
    slate: 'bg-[#F3F7F5] text-[#6B7C73] border-transparent',
    purple: 'bg-[#EDE9FE] text-[#5B21B6] border-transparent',
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = 'slate', size = 'sm' }) => (
    <span
        className={`inline-flex items-center border rounded-md font-bold tracking-wide transition-colors ${variantMap[variant]} ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
            }`}
    >
        {label}
    </span>
);

export const statusBadge = (status: string) => {
    const map: Record<string, BadgeProps> = {
        open: { label: 'Open', variant: 'slate' },
        in_progress: { label: 'In Progress', variant: 'indigo' },
        done: { label: 'Done', variant: 'emerald' },
        error: { label: 'Error', variant: 'red' },
        active: { label: 'Active', variant: 'indigo' },
        paused: { label: 'Paused', variant: 'amber' },
        completed: { label: 'Completed', variant: 'emerald' },
    };
    const props = map[status] || { label: status, variant: 'slate' };
    return <Badge {...props} />;
};

export const priorityBadge = (priority: string) => {
    const map: Record<string, BadgeProps> = {
        low: { label: 'Low', variant: 'slate' },
        medium: { label: 'Medium', variant: 'amber' },
        high: { label: 'High', variant: 'red' },
    };
    const props = map[priority] || { label: priority, variant: 'slate' };
    return <Badge {...props} />;
};

export const typeBadge = (type: string) => {
    const map: Record<string, BadgeProps> = {
        personal: { label: 'Personal', variant: 'purple' },
        project: { label: 'Project', variant: 'indigo' },
        client: { label: 'Client', variant: 'emerald' },
    };
    const props = map[type] || { label: type, variant: 'slate' };
    return <Badge {...props} />;
};
