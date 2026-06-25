import React, { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    iconLeft?: React.ReactNode;
    iconRight?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
                                                                            children,
                                                                            className = '',
                                                                            variant = 'primary',
                                                                            size = 'md',
                                                                            isLoading = false,
                                                                            iconLeft,
                                                                            iconRight,
                                                                            disabled,
                                                                            ...props
                                                                        }, ref) => {
    const baseStyles = "font-sans font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98] select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";

    const variants = {
        primary: "bg-primary text-white hover:bg-primary-hover shadow-md shadow-primary/20",
        secondary: "bg-white text-ink hover:bg-slate-50 border border-slate-200 shadow-xs",
        danger: "bg-danger text-white hover:bg-danger-hover shadow-md shadow-danger/20",
        outline: "bg-transparent text-primary border-2 border-primary hover:bg-primary/5"
    };

    const sizes = {
        sm: "h-9 px-4 text-xs rounded-xl",
        md: "h-12 px-6 text-sm rounded-2xl",
        lg: "h-14 px-8 text-base rounded-2xl"
    };

    return (
        <button
            ref={ref}
            disabled={disabled || isLoading}
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            {...props}
        >
            {isLoading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
            ) : iconLeft}

            <span>{children}</span>

            {!isLoading && iconRight}
        </button>
    );
});

Button.displayName = 'Button';