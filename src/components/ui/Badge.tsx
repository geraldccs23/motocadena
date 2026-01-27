import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';
    className?: string;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    variant = 'default',
    className = ''
}) => {
    const variants = {
        default: 'bg-zinc-800 text-zinc-300',
        success: 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20',
        warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20',
        danger: 'bg-red-500/10 text-red-500 border border-red-500/20',
        info: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
        outline: 'border border-zinc-700 text-zinc-400',
    };

    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${variants[variant]} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
