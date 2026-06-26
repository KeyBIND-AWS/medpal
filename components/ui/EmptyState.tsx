"use client";

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
    return (
        <div className="w-full flex flex-col items-center justify-center py-20 px-6 text-center animate-in fade-in zoom-in-95 duration-300">

            <div className="mb-6 relative w-24 h-12 bg-slate-200/50 rounded-full flex items-center p-1.5 opacity-80">
                <div className="w-9 h-9 rounded-full bg-slate-300/50 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-white" />
                </div>
                <div className="w-3 h-3 rounded-full bg-slate-300/50 ml-2" />
            </div>

            <h3 className="font-sans font-extrabold text-xl text-ink mb-2 tracking-tight">
                {title}
            </h3>

            <p className="text-sm text-muted max-w-[240px] leading-relaxed mb-8">
                {description}
            </p>

            {actionLabel && onAction && (
                <Button variant="primary" onClick={onAction} className="w-full max-w-[200px]">
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}