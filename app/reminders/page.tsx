"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { ReminderCard } from '@/components/ui/ReminderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { SunIcon, CloudSunIcon, MoonIcon, Plus as PlusIcon } from '@phosphor-icons/react';
import { AddReminderModal } from '@/components/ui/AddReminderModal';
import { Button } from '@/components/ui/Button';

type Reminder = {
    id: string;
    drugName: string;
    dosage: string;
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    instruction: string;
    isActive: boolean;
};

function derivePeriod(time: string): 'morning' | 'afternoon' | 'evening' {
    const match = time.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (!match) return 'morning';
    let hour = parseInt(match[1], 10);
    const meridiem = match[3]?.toUpperCase();
    if (meridiem === 'PM' && hour !== 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
}

// Helper to format 24h string time (e.g. "08:00") into 12h string time (e.g. "8:00 AM")
function formatTimeTo12Hour(time24: string): string {
    if (!time24) return '';
    const [hourStr, minuteStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    const formattedMinute = minute.toString().padStart(2, '0');
    return `${hour12}:${formattedMinute} ${ampm}`;
}

// Helper to categorize time into period
function getPeriodFromTime(time24: string): 'morning' | 'afternoon' | 'evening' {
    const [hourStr] = time24.split(':');
    const hour = parseInt(hourStr, 10);
    if (hour >= 5 && hour < 12) {
        return 'morning';
    } else if (hour >= 12 && hour < 17) {
        return 'afternoon';
    } else {
        return 'evening';
    }
}

export default function RemindersPage() {
    const { t } = useTranslation();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadReminders = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/reminders');
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to load reminders');

                const mapped: Reminder[] = data.map((r: any) => ({
                    id: r.id,
                    drugName: r.medication?.drug_name ?? 'Unknown medication',
                    dosage: r.medication?.dosage ?? '',
                    time: r.time,
                    period: derivePeriod(r.time),
                    instruction: r.label,
                    isActive: r.is_active,
                }));
                setReminders(mapped);
            } catch (err) {
                console.error('Failed to load reminders:', err);
                setReminders([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadReminders();
    }, []);

    const handleToggle = async (id: string, newState: boolean) => {
        setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: newState } : r));

        try {
            const response = await fetch(`/api/reminders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: newState }),
            });
            if (!response.ok) throw new Error('Failed to update reminder');
        } catch (err) {
            console.error('Failed to persist reminder toggle:', err);
            setReminders(prev => prev.map(r => r.id === id ? { ...r, isActive: !newState } : r));
        }
    };

    const handleAddReminder = (drugName: string, dosage: string, instruction: string, times: string[]) => {
        const newReminders: Reminder[] = times.map(time24 => ({
            id: Math.random().toString(36).substr(2, 9),
            drugName,
            dosage: dosage || '1 tablet',
            time: formatTimeTo12Hour(time24),
            period: getPeriodFromTime(time24),
            instruction: instruction || 'As directed',
            isActive: true
        }));

        setReminders(prev => [...prev, ...newReminders]);
    };

    const morning = reminders.filter(r => r.period === 'morning');
    const afternoon = reminders.filter(r => r.period === 'afternoon');
    const evening = reminders.filter(r => r.period === 'evening');

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    if (reminders.length === 0) {
        return (
            <div className="w-full h-full flex flex-col p-4 md:p-6 justify-center">
                <EmptyState
                    title={t.remindersPage.emptyTitle}
                    description={t.remindersPage.emptyDesc}
                    actionLabel={t.remindersPage.addReminderButton}
                    onAction={() => setIsModalOpen(true)}
                />
                <AddReminderModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleAddReminder}
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
        <div className="w-full flex flex-col p-4 md:p-6 gap-8 pb-24 relative">

            <div className="flex items-center justify-between gap-4">
                <button onClick={handleTestNotification} className="text-xs text-slate-550 border border-slate-200 rounded-xl px-3 py-2 hover:bg-slate-100 transition-colors duration-200 cursor-pointer">
                    [DEV] Notification Test
                </button>
                <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsModalOpen(true)}
                    iconLeft={<PlusIcon className="w-4 h-4" weight="bold" />}
                    className="h-10 rounded-xl shadow-xs"
                >
                    {t.remindersPage.addReminderButton}
                </Button>
            </div>


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

            <AddReminderModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleAddReminder}
            />

        </div>
    );
}