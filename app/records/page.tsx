"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { RecordCard } from '@/components/ui/RecordCard';
import { EmptyState } from '@/components/ui/EmptyState';

type FilterType = 'all' | 'prescription' | 'lab_result';

type RecordSummary = {
    id: string;
    type: 'prescription' | 'lab_result';
    title: string;
    date: string;
};

export default function RecordsPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const [filter, setFilter] = useState<FilterType>('all');
    const [records, setRecords] = useState<RecordSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadRecords = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/records');
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load records');

                const mapped: RecordSummary[] = data.map((r: any) => ({
                    id: r.id,
                    type: r.type,
                    title: r.summary,
                    date: new Date(r.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
                }));
                setRecords(mapped);
            } catch (err) {
                console.error('Failed to load records:', err);
                setRecords([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadRecords();
    }, []);

    const filteredRecords = records.filter(rec => filter === 'all' || rec.type === filter);

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-6">

            {/* Clean iOS-style Filter Tabs */}
            {records.length > 0 && (
                <div className="w-full bg-slate-200/80 p-1 rounded-xl flex items-center gap-1 shrink-0">
                    {(['all', 'prescription', 'lab_result'] as FilterType[]).map((f) => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`flex-1 py-2 rounded-lg font-sans font-semibold text-[11px] uppercase tracking-wider transition-all ${
                                filter === f
                                    ? 'bg-white text-primary shadow-sm'
                                    : 'text-muted hover:text-ink'
                            }`}
                        >
                            {f === 'all' ? t.recordsList.all : f === 'prescription' ? t.recordsList.prescriptions : t.recordsList.labResults}
                        </button>
                    ))}
                </div>
            )}

            {/* List Content or Empty State */}
            <div className="flex flex-col gap-3">
                {records.length === 0 ? (
                    <EmptyState
                        title={t.emptyStates.noRecordsTitle}
                        description={t.emptyStates.noRecordsDesc}
                        actionLabel={t.emptyStates.scanNow}
                        onAction={() => router.push('/scan')}
                    />
                ) : filteredRecords.length === 0 ? (
                    // In case they filter to 'Labs' but only have 'Prescriptions'
                    <div className="text-center py-12 text-sm text-muted">
                        No records found for this category.
                    </div>
                ) : (
                    filteredRecords.map((record) => (
                        <div key={record.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300 fill-mode-both" style={{ animationDelay: `${records.indexOf(record) * 50}ms` }}>
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