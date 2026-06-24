"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ChatBubble } from '@/components/ui/ChatBubble';
import { ChatInput } from '@/components/ui/ChatInput';

type Message = {
    id: string;
    text: string;
    isUser: boolean;
};

export default function ChatPage() {
    const { t } = useTranslation();
    const bottomRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);

    // Initialize with greeting
    useEffect(() => {
        setMessages([
            { id: '1', text: t.chatPage.greeting, isUser: false }
        ]);
    }, [t.chatPage.greeting]);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSendMessage = (text: string) => {
        // 1. Add User Message
        const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        // 2. Mock AI Response Delay (Replace with POST /api/chat on Day 4)
        setTimeout(() => {
            const aiMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Ang <b>Amlodipine</b> usa ka tambal para sa hataas nga presyon sa dugo (high blood pressure). Gina-relax niini ang imong mga ugat aron mas sayon mudagan ang dugo.",
                isUser: false
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500);
    };

    return (
        <div className="flex flex-col h-full min-h-full relative">

            {/* Scrollable Message List */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 pb-24">

                <p className="text-center text-xs text-slate-400 font-medium mb-4 mx-8">
                    {t.chatPage.emptyDisclaimer}
                </p>

                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} />
                ))}

                {isTyping && (
                    <ChatBubble message="" isUser={false} isTyping={true} />
                )}

                {/* Invisible anchor to scroll to */}
                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Sticky Input Area */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#EFEFEF] via-[#EFEFEF] to-transparent pt-8 z-10">
                <ChatInput
                    placeholder={t.chatPage.placeholder}
                    onSend={handleSendMessage}
                    disabled={isTyping}
                />
            </div>

        </div>
    );
}