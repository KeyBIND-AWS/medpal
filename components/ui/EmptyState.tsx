"use client";

import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    icon?: React.ReactNode;
}

const DefaultIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
);

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
    return (
        <div className="w-full flex flex-col items-center justify-center pt-10 pb-0 px-6 text-center animate-in fade-in zoom-in-95 duration-300">

            <div className="mb-5 w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                {icon ?? <DefaultIcon />}
            </div>

            <h3 className="font-sans font-extrabold text-lg text-ink mb-2 tracking-tight">
                {title}
            </h3>

            <p className="text-sm text-muted max-w-[220px] leading-6 mb-7">
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