"use client";

import React, { useState } from 'react';
import { PaperPlaneRightIcon } from '@phosphor-icons/react';

interface ChatInputProps {
    placeholder: string;
    onSend: (message: string) => void;
    disabled?: boolean;
}

export function ChatInput({ placeholder, onSend, disabled }: ChatInputProps) {
    const [text, setText] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (text.trim() && !disabled) {
            onSend(text.trim());
            setText('');
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="w-full flex items-center gap-2 bg-white p-2 rounded-full shadow-lg border border-slate-200"
        >
            <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={placeholder}
                disabled={disabled}
                className="flex-1 bg-transparent px-4 py-2 text-[15px] outline-none text-ink placeholder:text-muted disabled:opacity-50"
            />
            <button
                type="submit"
                disabled={!text.trim() || disabled}
                className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shrink-0 disabled:bg-slate-200 disabled:text-muted transition-colors"
            >
                <PaperPlaneRightIcon className="w-5 h-5" weight="fill" />
            </button>
        </form>
    );
}