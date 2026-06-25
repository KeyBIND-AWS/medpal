"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card } from './Card';
import { Badge } from './Badge';
import { CaretRightIcon } from '@phosphor-icons/react';

interface RecordCardProps {
    id: string;
    type: 'prescription' | 'lab_result';
    title: string;
    date: string;
}

export function RecordCard({ id, type, title, date }: RecordCardProps) {
    const router = useRouter();

    const typeLabel = type === 'prescription' ? 'Prescription' : 'Lab Result';

    return (
        <Card
            isInteractive
            onClick={() => router.push(`/records/${id}`)}
            className="w-full flex items-center justify-between group"
        >
            <div className="flex flex-col items-start gap-2">
                <Badge variant="primary">{typeLabel}</Badge>

                <div className="flex flex-col">
                    <h3 className="font-sans font-bold text-ink text-[15px]">
                        {title}
                    </h3>
                    <span className="text-xs text-muted font-medium mt-0.5">
                        {date}
                    </span>
                </div>
            </div>

            <CaretRightIcon
                className="w-5 h-5 text-muted group-hover:text-primary transition-colors"
                weight="bold"
            />
        </Card>
    );
}