"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationCard } from '@/components/ui/MedicationCard';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { ScanResult } from '@/types/schema';
import { BellIcon, TrashIcon, CaretLeftIcon } from '@phosphor-icons/react';

export default function RecordDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();

    const [recordData, setRecordData] = useState<ScanResult | null>(null);

    // MOCK DATA FETCH (Swap this for GET /api/records/:id later)
    useEffect(() => {
        const timer = setTimeout(() => {
            setRecordData({
                id: params.id as string,
                readable: true,
                summary: "This is a saved prescription for blood pressure and cholesterol management.",
                created_at: new Date().toISOString(),
                medications: [
                    {
                        drug_name: "Amlodipine",
                        dosage: "5mg",
                        frequency: "Once daily",
                        purpose: "High blood pressure",
                        instructions: "1 tablet every breakfast"
                    },
                    {
                        drug_name: "Atorvastatin",
                        dosage: "20mg",
                        frequency: "Once daily",
                        purpose: "Cholesterol",
                        instructions: "1 tablet before bed"
                    }
                ]
            });
        }, 400);

        return () => clearTimeout(timer);
    }, [params.id]);

    if (!recordData) {
        return (
            <div className="w-full h-full min-h-[50vh] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-6 animate-in fade-in duration-300 pb-24">

            {/* Back Button for internal navigation */}
            <button
                onClick={() => router.back()}
                className="flex items-center gap-1 text-sm font-bold text-muted hover:text-ink transition-colors self-start mb-2"
            >
                <CaretLeftIcon className="w-4 h-4" weight="bold" />
                Back to Records
            </button>

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
                    className="w-full text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors"
                    onClick={() => {
                        // Mock delete action
                        router.push('/records');
                    }}
                    iconLeft={<TrashIcon className="w-5 h-5" weight="fill" />}
                >
                    Delete Record
                </Button>
            </div>

        </div>
    );
}