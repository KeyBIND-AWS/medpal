"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { RecordCard } from '@/components/ui/RecordCard';
import { EmptyState } from '@/components/ui/EmptyState';

type FilterType = 'all' | 'prescription' | 'lab_result';

export default function RecordsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [filter, setFilter] = useState<FilterType>('all');

    // MOCK DATA: To be replaced with GET /api/records on Day 4
    const mockRecords = [
        { id: '1', type: 'prescription', title: 'Amlodipine • Metformin', date: 'June 18, 2026' },
        { id: '2', type: 'lab_result', title: 'Complete Blood Count', date: 'June 12, 2026' },
        { id: '3', type: 'prescription', title: 'Losartan • Atorvastatin', date: 'May 30, 2026' },
    ] as const;

    const filteredRecords = mockRecords.filter(rec => filter === 'all' || rec.type === filter);

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-6">

            {/* Clean iOS-style Filter Tabs */}
            {mockRecords.length > 0 && (
                <div className="w-full bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shrink-0">
                    {(['all', 'prescription', 'lab_result'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-2 rounded-lg font-poppins font-semibold text-[11px] uppercase tracking-wider transition-all ${
                                filter === f
                                    ? 'bg-white text-[#2B4BFF] shadow-sm'
                                    : 'text-slate-500 hover:text-slate-800'
                            }`}
                        >
                            {f === 'all' ? t.recordsList.all : f === 'prescription' ? t.recordsList.prescriptions : t.recordsList.labResults}
                        </button>
                    ))}
                </div>
            )}

            {/* List Content or Empty State */}
            <div className="flex flex-col gap-3">
                {/*@ts-ignore*/}
                {mockRecords.length === 0 ? (
                    <EmptyState
                        title={t.emptyStates.noRecordsTitle}
                        description={t.emptyStates.noRecordsDesc}
                        actionLabel={t.emptyStates.scanNow}
                        onAction={() => router.push('/scan')}
                    />
                ) : filteredRecords.length === 0 ? (
                    // In case they filter to 'Labs' but only have 'Prescriptions'
                    <div className="text-center py-12 text-sm text-slate-500">
                        No records found for this category.
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div key={record.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${mockRecords.indexOf(record) * 50}ms` }}>
                            <RecordCard
                                id={record.id}
                                type={record.type}
                                title={record.title}
                                date={record.date}
                            />
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}