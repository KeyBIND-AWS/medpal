"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { RecordCard } from '@/components/ui/RecordCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { PlusIcon } from '@phosphor-icons/react';

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

    // Modal state variables
    const [isMedModalOpen, setIsMedModalOpen] = useState(false);
    const [drugName, setDrugName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [purpose, setPurpose] = useState('');
    const [instructions, setInstructions] = useState('');
    const [timing, setTiming] = useState<string[]>([]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [warnings, setWarnings] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

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

    useEffect(() => {
        loadRecords();
    }, []);

    const handleTimingChange = (option: string) => {
        if (timing.includes(option)) {
            setTiming(timing.filter((t) => t !== option));
        } else {
            setTiming([...timing, option]);
        }
    };

    const handleCloseModal = () => {
        setIsMedModalOpen(false);
        setDrugName('');
        setDosage('');
        setFrequency('');
        setPurpose('');
        setInstructions('');
        setTiming([]);
        setStartDate('');
        setEndDate('');
        setWarnings('');
        setModalError(null);
    };

    const handleSubmitMedication = async (e: React.FormEvent) => {
        e.preventDefault();
        setModalError(null);

        if (!drugName.trim() || !dosage.trim() || !frequency.trim()) {
            setModalError('Drug name, dosage, and frequency are required.');
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch('/api/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    drug_name: drugName,
                    dosage,
                    frequency,
                    purpose: purpose || null,
                    timing,
                    instructions: instructions || null,
                    start_date: startDate || null,
                    end_date: endDate || null,
                    warnings: warnings || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create medication record');
            }

            handleCloseModal();
            // Reload list from backend dynamically
            await loadRecords();
        } catch (err) {
            console.error(err);
            const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
            setModalError(errorMessage);
        } finally {
            setSubmitting(false);
        }
    };

    const filteredRecords = records.filter(rec => filter === 'all' || rec.type === filter);

    const renderMedModal = () => {
        if (!isMedModalOpen) return null;

        const timingOptions = ['Morning', 'Afternoon', 'Evening', 'Bedtime'];

        return (
            <div className="fixed inset-0 z-55 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-poppins font-bold text-lg text-slate-900">
                            Add Medication Record
                        </h3>
                        <button
                            onClick={handleCloseModal}
                            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    <form onSubmit={handleSubmitMedication} className="flex flex-col gap-4">
                        {modalError && (
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                                {modalError}
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Drug Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={drugName}
                                onChange={(e) => setDrugName(e.target.value)}
                                placeholder="e.g. Amoxicillin"
                                required
                                disabled={submitting}
                                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Dosage <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                                placeholder="e.g. 500mg"
                                required
                                disabled={submitting}
                                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Frequency <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={frequency}
                                onChange={(e) => setFrequency(e.target.value)}
                                placeholder="e.g. Twice daily"
                                required
                                disabled={submitting}
                                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Purpose <span className="text-slate-400 font-medium">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={purpose}
                                onChange={(e) => setPurpose(e.target.value)}
                                placeholder="e.g. Bacterial infection"
                                disabled={submitting}
                                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Timing <span className="text-slate-400 font-medium">(Optional)</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {timingOptions.map((option) => {
                                    const isChecked = timing.includes(option);
                                    return (
                                        <button
                                            type="button"
                                            key={option}
                                            disabled={submitting}
                                            onClick={() => handleTimingChange(option)}
                                            className={`h-10 flex items-center justify-center gap-2 rounded-xl border text-xs font-semibold transition-all active:scale-[0.98] ${
                                                isChecked
                                                    ? 'bg-blue-50 border-blue-500/30 text-blue-600'
                                                    : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                                            }`}
                                        >
                                            <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-all ${
                                                isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300'
                                            }`}>
                                                {isChecked && (
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-2 h-2">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                                    </svg>
                                                )}
                                            </div>
                                            {option}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Start & End Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Start Date <span className="text-slate-400 font-medium">(Optional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    disabled={submitting}
                                    className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 text-sm outline-none transition-all"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    End Date <span className="text-slate-400 font-medium">(Optional)</span>
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    disabled={submitting}
                                    className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 text-sm outline-none transition-all"
                                />
                            </div>
                        </div>

                        {/* Warnings */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Warnings <span className="text-slate-400 font-medium">(Optional)</span>
                            </label>
                            <input
                                type="text"
                                value={warnings}
                                onChange={(e) => setWarnings(e.target.value)}
                                placeholder="e.g. May cause drowsiness"
                                disabled={submitting}
                                className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-700">
                                Instructions <span className="text-slate-400 font-medium">(Optional)</span>
                            </label>
                            <textarea
                                value={instructions}
                                onChange={(e) => setInstructions(e.target.value)}
                                placeholder="e.g. Take with food or milk"
                                disabled={submitting}
                                rows={2}
                                className="p-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none resize-none transition-all"
                            />
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={handleCloseModal}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                size="sm"
                                isLoading={submitting}
                            >
                                Add Medication
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    if (records.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-6 min-h-[70vh]">
                <EmptyState
                    title={t.emptyStates.noRecordsTitle}
                    description={t.emptyStates.noRecordsDesc}
                    actionLabel={t.emptyStates.scanNow}
                    onAction={() => router.push('/scan')}
                />
                
                <span className="text-xs text-muted font-bold -mt-2">OR</span>

                <Button
                    variant="secondary"
                    size="sm"
                    className="w-full max-w-[200px]"
                    iconLeft={<PlusIcon className="w-4 h-4" weight="bold" />}
                    onClick={() => setIsMedModalOpen(true)}
                >
                    Add Manually
                </Button>
                
                {renderMedModal()}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-6 animate-in fade-in duration-300 pb-24">
            
            <div className="flex items-center justify-between gap-3 shrink-0">
                <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    iconLeft={<PlusIcon className="w-4 h-4" weight="bold" />}
                    onClick={() => setIsMedModalOpen(true)}
                >
                    Add Medication
                </Button>
            </div>

            {/* Clean iOS-style Filter Tabs */}
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

            {/* List Content or Empty State */}
            <div className="flex flex-col gap-3">
                {filteredRecords.length === 0 ? (
                    <div className="text-center py-12 text-sm text-slate-500">
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

            {renderMedModal()}
        </div>
    );
}