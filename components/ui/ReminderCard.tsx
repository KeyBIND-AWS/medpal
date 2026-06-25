"use client";

import React from 'react';
import { Card } from './Card';
import { Toggle } from './Toggle';
import { ClockIcon, PillIcon } from '@phosphor-icons/react';

interface ReminderCardProps {
    drugName: string;
    dosage: string;
    time: string;
    instruction: string;
    isActive: boolean;
    onToggle: (newState: boolean) => void;
}

export function ReminderCard({ drugName, dosage, time, instruction, isActive, onToggle }: ReminderCardProps) {
    return (
        <Card className={`w-full flex items-center justify-between transition-all duration-300 ${!isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
            <div className="flex flex-col gap-2">

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
                <div className="flex flex-col">
                    <div className="flex items-center gap-1.5 text-primary font-semibold text-[15px]">
                        <PillIcon className="w-4 h-4" weight="fill" />
                        {drugName}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted text-xs mt-1 font-medium">
                        <ClockIcon className="w-3.5 h-3.5" />
                        {instruction}
                    </div>
                </div>

            </div>

            {/* Interactive Toggle */}
            <div className="pl-4 border-l border-slate-100 py-2">
                <Toggle enabled={isActive} onChange={onToggle} />
            </div>
        </Card>
    );
}