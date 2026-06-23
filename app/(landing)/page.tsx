'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Language } from '@/types';

const LANGUAGES: { value: Language; label: string }[] = [
  { value: 'bisaya', label: 'Bisaya' },
  { value: 'filipino', label: 'Filipino' },
  { value: 'english', label: 'English' },
];

export default function LandingPage() {
  const router = useRouter();
  const [language, setLanguage] = useState<Language>('bisaya');

  const handleGetStarted = () => {
    localStorage.setItem('medpal_language_pref', language);
    router.push('/scan');
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6 text-center">
      {/* TODO(Luis): swap for the real logo + blue circle animation from Figma */}
      <div className="flex h-32 w-32 items-center justify-center rounded-full bg-[#1A3AF5]">
        <span className="text-3xl font-bold text-white">HD</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">HatidDok</h1>
        {/* TODO: verify Bisaya phrasing with a native speaker (Day 2 task per master plan) */}
        <p className="mt-2 text-sm text-gray-500">
          Sabton ang imong reseta ug resulta sa lab — sa Bisaya.
        </p>
      </div>

      <div className="flex gap-2" role="group" aria-label="Language">
        {LANGUAGES.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            onClick={() => setLanguage(value)}
            aria-pressed={language === value}
            className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
              language === value
                ? 'border-[#1A3AF5] bg-[#1A3AF5] text-white'
                : 'border-gray-300 text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGetStarted}
        className="w-full max-w-xs rounded-xl bg-[#1A3AF5] py-3 text-base font-semibold text-white shadow-sm active:opacity-90"
      >
        Sugdan / Get Started
      </button>
    </div>
  );
}
