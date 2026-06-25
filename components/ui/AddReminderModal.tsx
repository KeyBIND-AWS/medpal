"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { Button } from './Button';
import { X as XIcon, Plus as PlusIcon, Trash as TrashIcon } from '@phosphor-icons/react';

interface AddReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (drugName: string, dosage: string, instruction: string, times: string[]) => void;
}

const DOSAGE_UNITS = [
    "mg", "mcg/µg", "g", "kg", "mL", "L", "gtt", "tsp", "tbsp", "fl oz", "cc",
    "mg/mL", "%", "mEq/mL", "IU", "U", "mEq", "mmol", "tab", "cap", "supp",
    "patch", "puff", "spray", "mg/hr", "mcg/min", "mg/kg/min", "mL/hr", "gtt/min", "mg/cm²"
];

export function AddReminderModal({ isOpen, onClose, onSave }: AddReminderModalProps) {
    const { t } = useTranslation();
    const [drugName, setDrugName] = useState('');
    const [dosageValue, setDosageValue] = useState('');
    const [dosageUnit, setDosageUnit] = useState('mg');
    const [instruction, setInstruction] = useState('');
    const [times, setTimes] = useState<string[]>(['08:00']); // Default to 8:00 AM

    const modalRef = useRef<HTMLDivElement>(null);
    const firstInputRef = useRef<HTMLInputElement>(null);
    const previousActiveElement = useRef<HTMLElement | null>(null);

    // Save previous active element & set focus to first input on open
    useEffect(() => {
        if (isOpen) {
            previousActiveElement.current = document.activeElement as HTMLElement;
            const timer = setTimeout(() => {
                firstInputRef.current?.focus();
            }, 50);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    // Restore focus on close
    useEffect(() => {
        if (!isOpen && previousActiveElement.current) {
            previousActiveElement.current.focus();
        }
    }, [isOpen]);

    // Escape key listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    // Focus trap inside the modal
    const handleModalKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab') return;
        if (!modalRef.current) return;

        const focusableElements = modalRef.current.querySelectorAll(
            'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), iframe, object, embed, [tabindex="0"], [contenteditable]'
        );

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0] as HTMLElement;
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

        if (e.shiftKey) {
            if (document.activeElement === firstElement) {
                lastElement.focus();
                e.preventDefault();
            }
        } else {
            if (document.activeElement === lastElement) {
                firstElement.focus();
                e.preventDefault();
            }
        }
    };

    const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleAddTime = () => {
        setTimes([...times, '']);
    };

    const handleTimeChange = (index: number, val: string) => {
        const newTimes = [...times];
        newTimes[index] = val;
        setTimes(newTimes);
    };

    const handleRemoveTime = (index: number) => {
        // Keep at least one time slot
        if (times.length > 1) {
            setTimes(times.filter((_, i) => i !== index));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const validTimes = times.filter(t => t.trim() !== '');
        if (!drugName.trim() || validTimes.length === 0) return;

        const combinedDosage = dosageValue.trim() ? `${dosageValue.trim()} ${dosageUnit}` : '';
        onSave(drugName, combinedDosage, instruction, validTimes);

        // Reset state
        setDrugName('');
        setDosageValue('');
        setDosageUnit('mg');
        setInstruction('');
        setTimes(['08:00']);
        onClose();
    };

    if (!isOpen) return null;

    const isFormValid = drugName.trim() !== '' && times.some(t => t.trim() !== '');

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={handleOverlayClick}
        >
            <div
                ref={modalRef}
                onKeyDown={handleModalKeyDown}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl p-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-450 hover:text-slate-600 transition-colors p-1 rounded-lg cursor-pointer"
                    aria-label="Close modal"
                >
                    <XIcon className="w-5 h-5" />
                </button>

                <h2 id="modal-title" className="text-xl font-bold text-slate-900 mb-6 pr-6">
                    {t.remindersPage.modalTitle}
                </h2>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Medicine Name */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="modalDrugName" className="text-xs font-bold text-slate-700">
                            {t.remindersPage.medicineNameLabel} <span className="text-[#2B4BFF]">*</span>
                        </label>
                        <input
                            ref={firstInputRef}
                            type="text"
                            id="modalDrugName"
                            value={drugName}
                            onChange={(e) => setDrugName(e.target.value)}
                            placeholder={t.remindersPage.medicineNamePlaceholder}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-[#2B4BFF] focus:ring-2 focus:ring-[#2B4BFF]/10 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all duration-200"
                            required
                        />
                    </div>

                    {/* Dosage Value & Unit */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="modalDosageValue" className="text-xs font-bold text-slate-700">
                                {t.remindersPage.dosageLabel}
                            </label>
                            <input
                                type="text"
                                id="modalDosageValue"
                                value={dosageValue}
                                onChange={(e) => setDosageValue(e.target.value)}
                                placeholder={t.remindersPage.dosagePlaceholder}
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-[#2B4BFF] focus:ring-2 focus:ring-[#2B4BFF]/10 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all duration-200"
                            />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="modalDosageUnit" className="text-xs font-bold text-slate-700">
                                {t.remindersPage.unitLabel}
                            </label>
                            <select
                                id="modalDosageUnit"
                                value={dosageUnit}
                                onChange={(e) => setDosageUnit(e.target.value)}
                                className="w-full h-11 px-3 rounded-xl border border-slate-200 focus:border-[#2B4BFF] focus:ring-2 focus:ring-[#2B4BFF]/10 bg-white text-slate-900 text-sm outline-none transition-all duration-200 cursor-pointer"
                            >
                                {DOSAGE_UNITS.map(unit => (
                                    <option key={unit} value={unit}>
                                        {unit}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="modalInstruction" className="text-xs font-bold text-slate-700">
                            {t.remindersPage.instructionsLabel}
                        </label>
                        <input
                            type="text"
                            id="modalInstruction"
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            placeholder={t.remindersPage.instructionsPlaceholder}
                            className="w-full h-11 px-4 rounded-xl border border-slate-200 focus:border-[#2B4BFF] focus:ring-2 focus:ring-[#2B4BFF]/10 text-slate-900 placeholder-slate-400 text-sm outline-none transition-all duration-200"
                        />
                    </div>

                    {/* Scheduled Times */}
                    <div className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-700">
                            {t.remindersPage.timesLabel} <span className="text-[#2B4BFF]">*</span>
                        </span>
                        
                        <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1">
                            {times.map((time, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <label htmlFor={`modalTime-${index}`} className="sr-only">
                                        Time Slot {index + 1}
                                    </label>
                                    <input
                                        type="time"
                                        id={`modalTime-${index}`}
                                        value={time}
                                        onChange={(e) => handleTimeChange(index, e.target.value)}
                                        className="flex-1 h-11 px-4 rounded-xl border border-slate-200 focus:border-[#2B4BFF] focus:ring-2 focus:ring-[#2B4BFF]/10 text-slate-900 text-sm outline-none transition-all duration-200"
                                        required
                                    />
                                    {times.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTime(index)}
                                            className="h-11 w-11 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50/50 transition-colors cursor-pointer"
                                            aria-label={`Remove time slot ${index + 1}`}
                                        >
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={handleAddTime}
                            className="inline-flex items-center gap-1.5 text-xs text-[#2B4BFF] font-bold hover:text-[#253ee0] transition-colors self-start mt-1 cursor-pointer"
                        >
                            <PlusIcon className="w-4 h-4" weight="bold" />
                            {t.remindersPage.addTimeButton}
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="h-11 px-4 text-slate-550 hover:text-slate-750 text-sm font-semibold transition-colors cursor-pointer"
                        >
                            {t.remindersPage.cancelButton}
                        </button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="md"
                            disabled={!isFormValid}
                            className="h-11 px-5 text-sm"
                        >
                            {t.remindersPage.saveButton}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
