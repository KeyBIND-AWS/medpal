import React, { HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    isInteractive?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
                                                                     children,
                                                                     className = '',
                                                                     isInteractive = false,
                                                                     onClick,
                                                                     ...props
                                                                 }, ref) => {
    // Base MedPal styling: clean white, chunky 2xl rounded corners, soft shadow
    const baseStyles = "bg-white rounded-2xl p-5 shadow-xs border border-slate-100";

    // Interactive additions for clickable cards (like the Records list)
    const interactiveStyles = isInteractive
        ? "transition-all duration-200 hover:shadow-md hover:border-primary/30 active:scale-[0.98] cursor-pointer select-none"
        : "";

    return (
        <div
            ref={ref}
            onClick={onClick}
            className={`${baseStyles} ${interactiveStyles} ${className}`}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';