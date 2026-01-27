import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg' | 'icon';
    isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
        primary: 'bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800',
        secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700 active:bg-zinc-600',
        outline: 'border border-zinc-700 bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white',
        ghost: 'bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
        danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
    };

    const sizes = {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 py-2',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
    };

    const variantStyle = variants[variant];
    const sizeStyle = sizes[size];

    return (
        <button
            className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-transparent" />
            ) : null}
            {children}
        </button>
    );
};

export default Button;
