import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

const Card: React.FC<CardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            className={`bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm ${onClick ? 'cursor-pointer hover:border-zinc-700 transition-colors' : ''} ${className}`}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-b border-zinc-800 ${className}`}>
        {children}
    </div>
);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`px-6 py-4 ${className}`}>
        {children}
    </div>
);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
    <div className={`px-6 py-4 border-t border-zinc-800 bg-black/20 ${className}`}>
        {children}
    </div>
);

export default Card;
