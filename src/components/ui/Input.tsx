import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, className = '', ...props }, ref) => {
        return (
            <div className="w-full space-y-1.5">
                {label && (
                    <label className="text-sm font-medium text-zinc-400">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`
            flex h-10 w-full rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-sm 
            text-zinc-100 ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm 
            file:font-medium placeholder:text-zinc-500 focus-visible:outline-none 
            focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 
            disabled:cursor-not-allowed disabled:opacity-50 
            ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}
            ${className}
          `}
                    {...props}
                />
                {error && (
                    <p className="text-xs text-red-500">{error}</p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input;
