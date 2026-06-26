"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationCard } from '@/components/ui/MedicationCard';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { ScanResult } from '@/types/schema';
import { BellIcon, TrashIcon } from '@phosphor-icons/react';

export default function RecordDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();

    const [recordData, setRecordData] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        const loadRecord = async () => {
            setError(null);
            try {
                const response = await fetch(`/api/records/${params.id}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load record');
                setRecordData(data as ScanResult);
            } catch (err: any) {
                console.error('Failed to load record:', err);
                setError(err.message || 'Failed to load record');
            }
        };

        if (params.id) {
            loadRecord();
        }
    }, [params.id]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this record?')) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/records/${params.id}`, {
                method: 'DELETE'
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete record');
            }
            router.push('/records');
        } catch (err: any) {
            console.error('Failed to delete record:', err);
            alert(err.message || 'Failed to delete record');
        } finally {
            setDeleting(false);
        }
    };

    if (error) {
        return (
            <div className="w-full h-full min-h-[50vh] flex flex-col items-center justify-center px-6 text-center gap-4">
                <p className="text-sm text-slate-500 font-semibold">{error}</p>
                <Button variant="secondary" size="sm" onClick={() => router.push('/records')}>
                    Back to Records
                </Button>
            </div>
        );
    }

    if (!recordData) {
        return (
            <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-6 animate-in fade-in duration-300 pb-24">

            {/* 1. Dynamic Summary */}
            <p className="text-sm text-muted font-medium px-2">
                {recordData.summary}
            </p>

            {/* 2. Medication Cards Stack */}
            <div className="flex flex-col gap-4">
                {recordData.medications.map((med, index) => (
                    <MedicationCard key={index} medication={med} />
                ))}
            </div>

            {/* 3. Safety Disclaimer */}
            <DisclaimerBanner />

            {/* 4. Bottom Action Bar (Specific to Saved Records) */}
            <div className="flex flex-col gap-3 mt-4">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full shadow-md"
                    onClick={() => router.push('/reminders')}
                    iconLeft={<BellIcon className="w-5 h-5" weight="fill" />}
                >
                    {t.results.setReminders}
                </Button>

                <Button
                    variant="secondary"
                    size="lg"
                    isLoading={deleting}
                    className="w-full text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    onClick={handleDelete}
                    iconLeft={<TrashIcon className="w-5 h-5" weight="fill" />}
                >
                    Delete Record
                </Button>
            </div>

        </div>
    );
}