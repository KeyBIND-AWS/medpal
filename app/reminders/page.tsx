"use client";

import React, { useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ReminderCard } from '@/components/ui/ReminderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SunIcon, CloudSunIcon, MoonIcon } from '@phosphor-icons/react';

type Reminder = {
    id: string;
    drugName: string;
    dosage: string;
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    instruction: string;
    isActive: boolean;
};

// Initial Mock Data
const INITIAL_REMINDERS: Reminder[] = [
    { id: '1', drugName: 'Amlodipine', dosage: '5mg', time: '8:00 AM', period: 'morning', instruction: 'After breakfast', isActive: true },
    { id: '2', drugName: 'Metformin', dosage: '500mg', time: '8:00 AM', period: 'morning', instruction: 'With breakfast', isActive: true },
    { id: '3', drugName: 'Metformin', dosage: '500mg', time: '1:00 PM', period: 'afternoon', instruction: 'With lunch', isActive: false },
    { id: '4', drugName: 'Atorvastatin', dosage: '20mg', time: '8:00 PM', period: 'evening', instruction: 'Before bed', isActive: true },
];

export default function RemindersPage() {
    const { t } = useTranslation();
    const [reminders, setReminders] = useState<Reminder[]>(INITIAL_REMINDERS);

    const handleToggle = (id: string, newState: boolean) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: newState } : r));
    };

    const morning = reminders.filter(r => r.period === 'morning');
    const afternoon = reminders.filter(r => r.period === 'afternoon');
    const evening = reminders.filter(r => r.period === 'evening');

    if (reminders.length === 0) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <EmptyState
                    title={t.remindersPage.emptyTitle}
                    description={t.remindersPage.emptyDesc}
                />
            </div>
        );
    }

    // Instantly ask browser for permission, then fire the SW Turbo-Engine
    const handleTestNotification = async () => {
        if (!('Notification' in window)) {
            alert('Your browser does not support native notifications.');
            return;
        }

        const permission = await Notification.requestPermission();

        if (permission === 'granted' && 'serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.active?.postMessage({
                    type: 'TEST_LOCAL_PUSH',
                    payload: {
                        title: '💊 ' + t.remindersPage.title,
                        body: 'Amlodipine (5mg) - ' + t.remindersPage.morning,
                        url: '/reminders'
                    }
                });
            });
        } else {
            alert('Please enable notifications in your browser settings to test!');
        }
    };

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-8 pb-24">

            <button onClick={handleTestNotification} className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition-colors duration-200">
                [DEV] Notification Test
            </button>


            {morning.length > 0 && (
                <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center gap-2 text-amber-500 font-bold px-1">
                        <SunIcon className="w-5 h-5" weight="fill" />
                        <h2 className="text-sm uppercase tracking-wider">{t.remindersPage.morning}</h2>
                    </div>
                    {morning.map(r => (
                        <ReminderCard key={r.id} {...r} onToggle={(state) => handleToggle(r.id, state)} />
                    ))}
                </section>
            )}

            {afternoon.length > 0 && (
                <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-75 fill-mode-both">
                    <div className="flex items-center gap-2 text-orange-500 font-bold px-1">
                        <CloudSunIcon className="w-5 h-5" weight="fill" />
                        <h2 className="text-sm uppercase tracking-wider">{t.remindersPage.afternoon}</h2>
                    </div>
                    {afternoon.map(r => (
                        <ReminderCard key={r.id} {...r} onToggle={(state) => handleToggle(r.id, state)} />
                    ))}
                </section>
            )}

            {evening.length > 0 && (
                <section className="flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 delay-150 fill-mode-both">
                    <div className="flex items-center gap-2 text-indigo-500 font-bold px-1">
                        <MoonIcon className="w-5 h-5" weight="fill" />
                        <h2 className="text-sm uppercase tracking-wider">{t.remindersPage.evening}</h2>
                    </div>
                    {evening.map(r => (
                        <ReminderCard key={r.id} {...r} onToggle={(state) => handleToggle(r.id, state)} />
                    ))}
                </section>
            )}

        </div>
    );
}