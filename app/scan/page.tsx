'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import CameraCapture from '@/components/CameraCapture';
import type { ScanResponse, ScanType } from '@/types';

type Step = 'capture' | 'preview' | 'uploading';

export default function ScanPage() {
  const router = useRouter();
  const [scanType, setScanType] = useState<ScanType>('prescription');
  const [step, setStep] = useState<Step>('capture');
  const [image, setImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = (imageBase64: string) => {
    setImage(imageBase64);
    setStep('preview');
  };

  const handleRetake = () => {
    setImage(null);
    setStep('capture');
  };

  const handleConfirm = async () => {
    if (!image) return;
    setStep('uploading');
    setError(null);

    try {
      const language = localStorage.getItem('medpal_language_pref') ?? 'bisaya';

      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image, type: scanType, language }),
      });

      if (!res.ok) throw new Error(`Scan failed with status ${res.status}`);

      const data: ScanResponse = await res.json();
      router.push(`/results/${data.id}`);
    } catch (err) {
      console.error('Scan submission failed:', err);
      setError('Wala namo na-process ang imong litrato. Palihug sulayi pag-usab.');
      setStep('preview');
    }
  };

  return (
    <div className="flex flex-col gap-6 px-4 py-6">
      <div className="flex rounded-full bg-gray-100 p-1">
        {(['prescription', 'lab_result'] as ScanType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setScanType(type)}
            aria-pressed={scanType === type}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition-colors ${
              scanType === type ? 'bg-white text-[#1A3AF5] shadow-sm' : 'text-gray-500'
            }`}
          >
            {type === 'prescription' ? 'Reseta' : 'Resulta sa Lab'}
          </button>
        ))}
      </div>

      {step === 'capture' && <CameraCapture onCapture={handleCapture} />}

      {step === 'preview' && image && (
        <div className="flex flex-col items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt="Captured prescription or lab result"
            className="aspect-[3/4] w-full rounded-xl object-cover"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="flex-1 rounded-lg border border-gray-300 py-3 text-sm font-medium text-gray-600"
            >
              Kuhaan Pag-usab
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="flex-1 rounded-lg bg-[#1A3AF5] py-3 text-sm font-medium text-white"
            >
              Isumiter
            </button>
          </div>
        </div>
      )}

      {step === 'uploading' && (
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-[#1A3AF5]" />
          <p className="text-sm text-gray-500">
            {scanType === 'prescription'
              ? 'Gibasa ang imong reseta...'
              : 'Gibasa ang imong resulta sa lab...'}
          </p>
        </div>
      )}
    </div>
  );
}
