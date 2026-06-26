"use client";

import React, { useRef, useState } from 'react';
import { Card } from './Card';
import { Toggle } from './Toggle';
import { ClockIcon, PillIcon, TrashIcon, PencilSimpleIcon } from '@phosphor-icons/react';

interface ReminderCardProps {
    drugName: string;
    dosage: string;
    time: string;
    instruction: string;
    isActive: boolean;
    onToggle: (newState: boolean) => void;
    onEdit?: () => void;
    onDelete?: () => void;
}

const THRESHOLD = 80;

export function ReminderCard({ drugName, dosage, time, instruction, isActive, onToggle, onEdit, onDelete }: ReminderCardProps) {
    const touchStartX = useRef(0);
    const [translateX, setTranslateX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
        setIsSwiping(true);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        const delta = e.touches[0].clientX - touchStartX.current;
        if (delta < 0) setTranslateX(Math.max(delta, -160));
    };

    const handleTouchEnd = () => {
        setIsSwiping(false);
        if (translateX <= -THRESHOLD && onDelete) {
            setIsDeleting(true);
            setTranslateX(-500);
            setTimeout(() => onDelete(), 280);
        } else {
            setTranslateX(0);
        }
    };

    return (
        <div
            className={`relative overflow-hidden rounded-2xl transition-[opacity,max-height,margin] duration-300 ${
                isDeleting ? 'opacity-0 max-h-0 mb-0' : 'max-h-[200px]'
            }`}
        >
            {/* Danger strip — only mounted while swiping */}
            {translateX < 0 && (
                <div className="absolute inset-y-0 right-0 w-24 bg-danger flex items-center justify-center rounded-r-2xl">
                    <TrashIcon className="w-6 h-6 text-white" weight="fill" />
                </div>
            )}

            {/* Swipeable card */}
            <div
                style={{
                    transform: `translateX(${translateX}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Card className={`w-full flex items-center justify-between gap-3 transition-all duration-300 ${!isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                    <div className="flex flex-col gap-2 min-w-0">

                        {/* Time & Dosage Header */}
                        <div className="flex items-center gap-2">
                            <span className="font-sans font-extrabold text-xl text-ink tracking-tight">
                                {time}
                            </span>
                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-md">
                                {dosage}
                            </span>
                        </div>

                        {/* Drug Name & Instructions */}
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-1.5 text-primary font-semibold text-[15px]">
                                <PillIcon className="w-4 h-4 shrink-0" weight="fill" />
                                <span className="truncate">{drugName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-muted text-xs mt-1 font-medium">
                                <ClockIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{instruction}</span>
                            </div>
                        </div>

                    </div>

                    {/* Edit + Toggle controls */}
                    <div className="flex items-center gap-1 pl-3 border-l border-slate-100 py-2 shrink-0">
                        {onEdit && (
                            <button
                                type="button"
                                onClick={onEdit}
                                aria-label="Edit reminder"
                                className="p-2 rounded-lg text-slate-400 hover:text-primary hover:bg-slate-50 active:scale-90 transition-all"
                            >
                                <PencilSimpleIcon className="w-5 h-5" />
                            </button>
                        )}
                        <Toggle enabled={isActive} onChange={onToggle} />
                    </div>
                </Card>
            </div>
        </div>
    );
}
