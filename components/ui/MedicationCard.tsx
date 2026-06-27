"use client";

import React from 'react';
import { Card } from './Card';
import { ListenButton } from './ListenButton';
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

    // RxNorm verification is a NEGATIVE-only safety signal: InferRxNorm is a fuzzy matcher
    // that confidently maps unknown names to similar-spelled wrong concepts, so a positive
    // match isn't trustworthy enough to show a confident "verified" badge. We only surface
    // the case where the name didn't resolve at all (false). null/undefined (fail-open or
    // not run) => show nothing.
    const rxnormUnverified = medication.rxnorm_verified === false;

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
                <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h4 className="font-poppins font-extrabold text-lg text-slate-900 tracking-tight break-words min-w-0">
                            {medication.drug_name}
                        </h4>
                        {rxnormUnverified && (
                            <span
                                title="Couldn't auto-confirm this drug name — double-check with your pharmacist"
                                className="flex items-center gap-1 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 shrink-0"
                            >
                                <WarningIcon className="w-3 h-3" weight="fill" />
                                Unverified
                            </span>
                        )}
                    </div>
                    <span className="bg-blue-50 text-[#2B4BFF] text-xs font-bold px-2.5 py-1 rounded-lg border border-blue-100 shrink-0 max-w-full break-words">
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
                <div className="flex items-center justify-between gap-3 text-xs text-slate-600">
                    <span className="font-bold shrink-0">Frequency:</span>
                    <span className="font-semibold text-slate-800 text-right min-w-0 break-words">{medication.frequency}</span>
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
                <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Directions</span>
                    <ListenButton compact text={medication.instructions} />
                </div>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                    {medication.instructions}
                </p>
            </div>
        </Card>
    );
}