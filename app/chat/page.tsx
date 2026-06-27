"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();
    const bottomRef = useRef<HTMLDivElement>(null);

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);

    // Load saved conversation history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetch('/api/chat');
                if (res.status === 401) {
                    router.push('/');
                    return;
                }
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to load history');

                const mapped: Message[] = (data.messages || []).map(
                    (m: { id: string; role: string; content: string }) => ({
                        id: m.id,
                        text: m.content,
                        isUser: m.role === 'user',
                    }),
                );
                setMessages(mapped);
            } catch (err) {
                console.error('Failed to load chat history:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadHistory();
    }, [router]);

    // Auto-scroll to bottom when messages update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, isLoading]);

    const handleSendMessage = async (text: string) => {
        // 1. Optimistically add the user's message
        const userMsg: Message = { id: Date.now().toString(), text, isUser: true };
        setMessages((prev) => [...prev, userMsg]);
        setIsTyping(true);

        // 2. Call the chat API (loads the user's meds + history server-side)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text }),
            });

            if (res.status === 401) {
                router.push('/');
                return;
            }

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Chat request failed');

            const aiMsg: Message = {
                id: `${Date.now() + 1}`,
                text: data.response,
                isUser: false,
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (err) {
            console.error('Chat request failed:', err);
            const errorMsg: Message = {
                id: `err-${Date.now()}`,
                text: t.chatPage.error,
                isUser: false,
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="flex flex-col h-full min-h-full relative">

            {/* Scrollable Message List */}
            <div className="flex-1 p-4 md:p-6 flex flex-col gap-4 pb-24">

                <p className="text-center text-xs text-muted font-medium mb-4 mx-8">
                    {t.chatPage.emptyDisclaimer}
                </p>

                {/* Persistent greeting (reacts to language changes) */}
                <ChatBubble message={t.chatPage.greeting} isUser={false} />

                {messages.map((msg) => (
                    <ChatBubble key={msg.id} message={msg.text} isUser={msg.isUser} />
                ))}

                {(isTyping || isLoading) && (
                    <ChatBubble message="" isUser={false} isTyping={true} />
                )}

                {/* Invisible anchor to scroll to */}
                <div ref={bottomRef} className="h-4" />
            </div>

            {/* Sticky Input Area */}
            <div className="sticky bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-canvas via-canvas to-transparent pt-8 z-10">
                <ChatInput
                    placeholder={t.chatPage.placeholder}
                    onSend={handleSendMessage}
                    disabled={isTyping || isLoading}
                />
            </div>

        </div>
    );
}
