"use client";

import React from 'react';
import { RobotIcon } from '@phosphor-icons/react';

interface ChatBubbleProps {
    message: string;
    isUser: boolean;
    isTyping?: boolean;
}

// Render the AI's plain-text Markdown safely: HTML is escaped first (so raw
// model output can't inject markup), then a minimal subset is converted.
function renderMarkdown(text: string): string {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return escaped
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>') // **bold**
        .replace(/\n/g, '<br/>'); // preserve line breaks
}

export function ChatBubble({ message, isUser, isTyping }: ChatBubbleProps) {
    if (isUser) {
        return (
            <div className="flex justify-end w-full animate-in fade-in slide-in-from-right-2 duration-300">
                <div className="bg-primary text-white text-[15px] leading-relaxed font-medium px-4 py-3 rounded-2xl rounded-tr-sm shadow-md max-w-[85%]">
                    {message}
                </div>
            </div>
        );
    }

    return (
        <div className="flex justify-start w-full gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            {/* MedPal Mini Avatar */}
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                <RobotIcon className="w-4 h-4 text-primary" weight="fill" />
            </div>

            <div className="bg-white text-ink text-[15px] leading-relaxed px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm border border-slate-100 max-w-[85%]">
                {isTyping ? (
                    <div className="flex gap-1.5 items-center h-6 px-1">
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                ) : (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }} />
                )}
            </div>
        </div>
    );
}