"use client";

import React from 'react';
import { Card } from './Card';
import { useTranslation } from '@/contexts/LanguageContext';
import { MedicationRecord } from '@/types/schema';

export function MedicationCard({ medication }: { medication: MedicationRecord }) {
    const { t } = useTranslation();

    return (
        <Card className="w-full">
            <div className="grid grid-cols-[80px_1fr] gap-y-3 mb-4">
        <span className="font-sans font-bold text-primary">
          {t.results.drugLabel}:
        </span>
                <span className="font-sans font-bold text-ink">
          {medication.drug_name}
        </span>

                <span className="font-sans font-bold text-primary">
          {t.results.quantityLabel}:
        </span>
                <span className="font-sans font-bold text-ink">
          {medication.dosage}
        </span>
            </div>

            <p className="text-sm text-muted leading-relaxed border-t border-slate-100 pt-4">
                {medication.instructions}
            </p>
        </Card>
    );
}