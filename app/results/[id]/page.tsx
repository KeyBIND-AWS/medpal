"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationCard } from '@/components/ui/MedicationCard';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Button } from '@/components/ui/Button';
import { ScanResult } from '@/types/schema';
import { ScanIcon, BellIcon } from '@phosphor-icons/react';

export default function ResultsPage() {
    const params = useParams();
    const router = useRouter();
    const { t } = useTranslation();

    const [resultData, setResultData] = useState<ScanResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadResult = async () => {
            setError(null);
            try {
                const response = await fetch(`/api/records/${params.id}`);
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load result');
                setResultData(data as ScanResult);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load result');
            }
        };

        loadResult();
    }, [params.id]);

    if (error) {
        return (
            <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center px-6 text-center">
                <p className="text-sm text-muted">{error}</p>
            </div>
        );
    }

    if (!resultData) {
        return (
            <div className="w-full h-[calc(100vh-8rem)] flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-[480px] mx-auto min-h-[calc(100vh-8rem)] flex flex-col p-6 gap-6 animate-in fade-in duration-300 pb-28">

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

            {/* Action bar (in-flow at bottom) */}
            <div className="w-full mt-4 flex flex-col gap-3">
                <Button
                    variant="primary"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push(`/reminders?scan_id=${Array.isArray(params.id) ? params.id[0] : params.id}`)}
                    iconLeft={<BellIcon className="w-5 h-5" weight="fill" />}
                >
                    {t.results.setReminders}
                </Button>

                <Button
                    variant="secondary"
                    size="lg"
                    className="w-full"
                    onClick={() => router.push('/scan')}
                    iconLeft={<ScanIcon className="w-5 h-5" weight="fill" />}
                >
                    Scan Again
                </Button>
            </div>

        </div>
    );
}