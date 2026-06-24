import React from 'react';

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'primary' | 'danger' | 'warning' | 'neutral';
    className?: string;
}

export function Badge({
                          children,
                          variant = 'primary',
                          className = ''
                      }: BadgeProps) {
    const baseStyles = "inline-flex items-center justify-center font-poppins font-bold tracking-wide rounded-full px-3 py-1 text-[10px] uppercase select-none";

    const variants = {
        primary: "bg-[#2B4BFF] text-white shadow-xs",
        danger: "bg-[#E74C3C]/10 text-[#E74C3C] border border-[#E74C3C]/20",
        warning: "bg-amber-500/10 text-amber-700 border border-amber-500/20",
        neutral: "bg-slate-200 text-slate-700"
    };

    return (
        <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
    );
}