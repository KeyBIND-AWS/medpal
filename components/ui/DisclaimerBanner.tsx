"use client";

import React from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

export function DisclaimerBanner({ className = '' }: { className?: string }) {
    const { t } = useTranslation();

    return (
        <aside
            className={`relative overflow-hidden w-full bg-[#FFFBEA] rounded-2xl p-4 pl-5 flex items-start gap-3 shadow-xs ${className}`}
            role="note"
        >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FF825C]" />

            <p className="text-xs text-slate-700 font-poppins leading-relaxed">
                {t.disclaimer.text}
            </p>
        </aside>
    );
}