"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationCard } from '@/components/ui/MedicationCard';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { ScanResult } from '@/types/schema';
import { FloppyDiskIcon, BellIcon } from '@phosphor-icons/react';

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();

    const [resultData, setResultData] = useState<ScanResult | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // MOCK DATA FETCH (Swap this for Supabase fetch when Brian's API is ready)
    useEffect(() => {
        // Simulating network delay
        const timer = setTimeout(() => {
            setResultData({
                id: params.id as string,
                readable: true,
                summary: "Ang doktor nagreseta ug tambal para sa high blood ug diabetes.",
                created_at: new Date().toISOString(),
                medications: [
                    {
                        drug_name: "Amlodipine",
                        dosage: "5mg",
                        frequency: "Once daily",
                        purpose: "High blood pressure",
                        instructions: "1 tablet every breakfast, lunch, and dinner"
                    },
                    {
                        drug_name: "Metformin",
                        dosage: "500mg",
                        frequency: "Once daily",
                        purpose: "Blood sugar control",
                        instructions: "1 tablet every breakfast, lunch, and dinner"
                    }
                ]
            });
        }, 600);

        return () => clearTimeout(timer);
    }, [params.id]);

    const handleSaveToRecords = async () => {
        setIsSaving(true);
        // TODO: POST /api/records
        setTimeout(() => {
            setIsSaving(false);
            router.push('/records');
        }, 1000);
    };

    if (!resultData) {
        return (
            <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-[480px] mx-auto min-h-[calc(100vh-8rem)] flex flex-col p-6 gap-6 animate-in fade-in duration-300">

            {/* 1. Dynamic Summary (From AI) */}
            <p className="text-sm text-muted font-medium px-2">
                {resultData.summary}
            </p>

            {/* 2. Medication Cards Stack */}
            <div className="flex flex-col gap-4">
                {resultData.medications.map((med, index) => (
                    <MedicationCard key={index} medication={med} />
                ))}
            </div>

            {/* 3. Safety Disclaimer */}
            <DisclaimerBanner />

            {/* 4. Bottom Action Bar */}
            <div className="flex flex-col gap-3 mt-4 mb-8">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={handleSaveToRecords}
                    isLoading={isSaving}
                    iconLeft={!isSaving && <FloppyDiskIcon className="w-5 h-5" weight="fill" />}
                >
                    {isSaving ? t.results.saving : t.results.saveToRecords}
                </Button>

                <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push('/reminders')}
                    disabled={isSaving}
                    iconLeft={<BellIcon className="w-5 h-5" weight="fill" />}
                >
                    {t.results.setReminders}
                </Button>
            </div>

        </div>
    );
}