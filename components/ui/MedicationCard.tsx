"use client";

import React from 'react';
import { Card } from './Card';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationRecord } from '@/types/schema';
import { CalendarIcon, WarningIcon, InfoIcon } from '@phosphor-icons/react';

export function MedicationCard({ medication }: { medication: MedicationRecord }) {
    const { t } = useTranslation();

    const displayGeneric = medication.generic_name && medication.generic_name.trim() !== '';
    const hasWarning = medication.warnings && medication.warnings.trim() !== '' && medication.warnings.trim().toLowerCase() !== 'null';
    const hasDates = medication.start_date || medication.end_date;
    const hasTiming = medication.timing && medication.timing.length > 0;
    const hasPurpose = medication.purpose && medication.purpose.trim() !== '' && medication.purpose !== 'Not specified';

    // Format Date helper
    const formatDate = (dateStr?: string | null) => {
        if (!dateStr) return 'Ongoing';
        try {
            return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    return (
        <Card className="w-full flex flex-col gap-4 p-5 hover:shadow-md transition-shadow duration-300">
            {/* Top Row: Drug details */}
            <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                    <h4 className="font-poppins font-extrabold text-lg text-slate-900 tracking-tight">
                        {medication.drug_name}
                    </h4>
                    <span className="bg-blue-50 text-[#2B4BFF] text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100 shrink-0">
                        {medication.dosage}
                    </span>
                </div>
                {displayGeneric && (
                    <span className="text-xs text-slate-400 font-semibold italic">
                        {medication.generic_name}
                    </span>
                )}
            </div>

            {/* Purpose pill */}
            {hasPurpose && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-xl self-start">
                    <InfoIcon className="w-4 h-4 text-slate-500" />
                    <span>Purpose: {medication.purpose}</span>
                </div>
            )}

            {/* Schedule & Timing Info */}
            <div className="flex flex-col gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="font-bold">Frequency:</span>
                    <span className="font-semibold text-slate-800">{medication.frequency}</span>
                </div>

                {hasTiming && (
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span className="font-bold shrink-0">Timing:</span>
                        <div className="flex flex-wrap gap-1 justify-end">
                            {medication.timing?.map((time, idx) => (
                                <span key={idx} className="bg-white text-slate-600 font-bold px-2 py-0.5 rounded-md border border-slate-200 text-[10px]">
                                    {time}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {hasDates && (
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1.5 border-t border-slate-200/60 mt-1">
                        <div className="flex items-center gap-1.5 font-bold">
                            <CalendarIcon className="w-4 h-4 text-slate-500" />
                            <span>Schedule:</span>
                        </div>
                        <span className="font-semibold text-slate-800 text-[11px]">
                            {formatDate(medication.start_date)} – {formatDate(medication.end_date)}
                        </span>
                    </div>
                )}
            </div>

            {/* Warnings Alert Box */}
            {hasWarning && (
                <div className="flex items-start gap-2.5 bg-amber-500/10 border border-amber-500/20 text-amber-800 p-3.5 rounded-2xl text-xs font-semibold leading-relaxed">
                    <WarningIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" weight="fill" />
                    <div className="flex flex-col gap-0.5">
                        <span className="font-bold uppercase tracking-wider text-[10px] text-amber-700">Warning</span>
                        <span>{medication.warnings}</span>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="flex flex-col gap-1 pt-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Directions</span>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {medication.instructions}
                </p>
            </div>
        </Card>
    );
}