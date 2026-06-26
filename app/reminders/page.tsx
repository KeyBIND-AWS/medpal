"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { ReminderCard } from '@/components/ui/ReminderCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { SunIcon, CloudSunIcon, MoonIcon, PlusIcon } from '@phosphor-icons/react';
import { createClient } from '@/utils/supabase/client';

type Reminder = {
    id: string;
    drugName: string;
    dosage: string;
    time: string;
    period: 'morning' | 'afternoon' | 'evening';
    instruction: string;
    isActive: boolean;
};

type MedicationOption = {
    id: string;
    drug_name: string;
    dosage: string;
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

export default function RemindersPage() {
    const { t } = useTranslation();
    const router = useRouter();
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [medications, setMedications] = useState<MedicationOption[]>([]);
    const [isLoadingMeds, setIsLoadingMeds] = useState(false);
    const [selectedMedId, setSelectedMedId] = useState('');
    const [time, setTime] = useState('08:00');
    const [label, setLabel] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

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

    useEffect(() => {
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

    const fetchMedications = async () => {
        setIsLoadingMeds(true);
        setModalError(null);
        try {
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                throw new Error('Not authenticated');
            }
            const { data, error } = await supabase
                .from('medications')
                .select('id, drug_name, dosage')
                .eq('user_id', session.user.id)
                .eq('is_active', true);
            if (error) throw error;
            setMedications(data || []);
            if (data && data.length > 0) {
                setSelectedMedId(data[0].id);
            }
        } catch (err: any) {
            console.error('Failed to load medications:', err);
            setModalError(err.message || 'Failed to load medications');
        } finally {
            setIsLoadingMeds(false);
        }
    };

    const handleOpenModal = () => {
        setIsModalOpen(true);
        setModalError(null);
        fetchMedications();
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedMedId('');
        setTime('08:00');
        setLabel('');
        setModalError(null);
    };

    const handleSubmitReminder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedMedId || !time || !label.trim()) {
            setModalError('All fields are required.');
            return;
        }

        setSubmitting(true);
        setModalError(null);

        try {
            const response = await fetch('/api/reminders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    medication_id: selectedMedId,
                    time,
                    label: label.trim()
                })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create reminder');

            // Find selected med details to append locally
            const selectedMed = medications.find(m => m.id === selectedMedId);

            const newReminder: Reminder = {
                id: data.id,
                drugName: selectedMed?.drug_name ?? 'Unknown medication',
                dosage: selectedMed?.dosage ?? '',
                time: data.time,
                period: derivePeriod(data.time),
                instruction: data.label,
                isActive: data.is_active,
            };

            setReminders(prev => {
                const updated = [...prev, newReminder];
                return updated.sort((a, b) => a.time.localeCompare(b.time));
            });

            handleCloseModal();
        } catch (err: any) {
            console.error('Failed to save reminder:', err);
            setModalError(err.message || 'An error occurred while saving the reminder.');
        } finally {
            setSubmitting(false);
        }
    };

    const morning = reminders.filter(r => r.period === 'morning');
    const afternoon = reminders.filter(r => r.period === 'afternoon');
    const evening = reminders.filter(r => r.period === 'evening');

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

    const renderModal = () => {
        if (!isModalOpen) return null;

        return (
            <div className="fixed inset-0 z-55 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
                <div className="w-full max-w-md p-6 rounded-3xl bg-white border border-slate-200 shadow-xl animate-in fade-in zoom-in-95 duration-200 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <h3 className="font-poppins font-bold text-lg text-slate-900">
                            Add Custom Reminder
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

                    {isLoadingMeds ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <span className="text-xs text-muted font-medium">Loading medications...</span>
                        </div>
                    ) : modalError && medications.length === 0 ? (
                        <div className="flex flex-col gap-4">
                            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                                {modalError}
                            </div>
                            <Button type="button" variant="secondary" size="sm" onClick={handleCloseModal}>
                                Close
                            </Button>
                        </div>
                    ) : medications.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-6 text-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-500 flex items-center justify-center">
                                <PlusIcon className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <h4 className="font-bold text-sm text-slate-800">No Active Medications</h4>
                                <p className="text-xs text-muted max-w-[280px]">
                                    You need to log at least one medication in your records before setting an alarm.
                                </p>
                            </div>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={() => {
                                    handleCloseModal();
                                    router.push('/records/add');
                                }}
                            >
                                Add Medication
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmitReminder} className="flex flex-col gap-4">
                            {modalError && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-semibold">
                                    {modalError}
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Select Medication
                                </label>
                                <select
                                    value={selectedMedId}
                                    onChange={(e) => setSelectedMedId(e.target.value)}
                                    required
                                    className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 text-sm outline-none transition-all cursor-pointer"
                                >
                                    {medications.map((med) => (
                                        <option key={med.id} value={med.id}>
                                            {med.drug_name} ({med.dosage})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Reminder Time
                                </label>
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => setTime(e.target.value)}
                                    required
                                    className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 text-sm outline-none transition-all"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-700">
                                    Instruction Label
                                </label>
                                <input
                                    type="text"
                                    value={label}
                                    onChange={(e) => setLabel(e.target.value)}
                                    placeholder="e.g. Take with water after breakfast"
                                    required
                                    className="h-11 px-4 rounded-xl bg-slate-50 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 text-slate-800 placeholder-slate-400 text-sm outline-none transition-all"
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
                                    Save Reminder
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="w-full h-full flex items-center justify-center min-h-[50vh]">
                <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            </div>
        );
    }

    if (reminders.length === 0) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 gap-4">
                <EmptyState
                    title={t.remindersPage.emptyTitle}
                    description={t.remindersPage.emptyDesc}
                    actionLabel="Add Reminder"
                    onAction={handleOpenModal}
                />
                {renderModal()}
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col p-4 md:p-6 gap-8 pb-24 animate-in fade-in duration-300">
            <div className="flex items-center justify-between gap-3 shrink-0">
                <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 max-w-[200px]"
                    iconLeft={<PlusIcon className="w-4 h-4" weight="bold" />}
                    onClick={handleOpenModal}
                >
                    Add Reminder
                </Button>

                <button
                    onClick={handleTestNotification}
                    className="px-3 h-9 text-[10px] uppercase font-bold tracking-wider border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 hover:text-slate-600 transition-colors"
                >
                    [DEV] Test Push
                </button>
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

            {renderModal()}
        </div>
    );
}