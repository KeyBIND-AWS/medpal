"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/contexts/LanguageContext';
import { CameraCapture } from '@/components/camera/CameraCapture';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowsClockwiseIcon, SparkleIcon, MicrophoneIcon } from '@phosphor-icons/react';

// Optional symptom-context copy per language (used for the anti-hallucination cross-check)
const SYMPTOM_COPY: Record<string, { label: string; placeholder: string }> = {
  bisaya: { label: 'Unsa imong gibati o sakit? (opsyonal)', placeholder: 'Pananglitan: sip-on, ubo, hilanat...' },
  filipino: { label: 'Ano ang nararamdaman mo? (opsyonal)', placeholder: 'Halimbawa: sipon, ubo, lagnat...' },
  english: { label: 'What are your symptoms? (optional)', placeholder: 'e.g. cold, cough, fever...' },
};
const SPEECH_LANG: Record<string, string> = { bisaya: 'fil-PH', filipino: 'fil-PH', english: 'en-US' };

type ScanType = 'prescription' | 'lab_result';

export default function ScanPage() {
  const router = useRouter();
  const { t, language } = useTranslation();

  const [scanType, setScanType] = useState<ScanType>('prescription');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [listening, setListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  const toggleListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = SPEECH_LANG[language] || 'fil-PH';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ');
      setSymptoms((prev) => (prev ? prev.trim() + ' ' : '') + transcript);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const symptomCopy = SYMPTOM_COPY[language] || SYMPTOM_COPY.bisaya;

  const handleProceed = async () => {
    if (!capturedImage) return;
    setIsAnalyzing(true);

    try {
      // Direct call to Brian's Bedrock endpoint per Master Plan architecture
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: capturedImage,
          type: scanType,
          language: language, // Tells Claude to output in Bisaya/Filipino
          symptoms: symptoms.trim() || undefined, // optional anti-hallucination cross-check
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'API Route pending or failed');

      router.push(`/results/${data.scan_id || 'demo-123'}`);
    } catch (err) {
      console.warn('Backend API /api/scan unavailable. Bypassing to UI demo view:', err);
      // HACKATHON FAILSAFE: Send to demo result page so Chubby can QA the UI flow!
      setTimeout(() => {
        router.push('/results/demo-123');
      }, 1500);
    }
  };

  return (
      <div className="flex flex-col w-full h-full p-4 md:p-6 gap-5">

        <div className="w-full bg-slate-200/80 p-1 rounded-2xl flex items-center gap-1 shrink-0">
          <button
              onClick={() => setScanType('prescription')}
              disabled={isAnalyzing}
              className={`flex-1 py-3 rounded-xl font-sans font-bold text-sm transition-all ${
                  scanType === 'prescription'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted hover:text-ink'
              }`}
          >
            {t.scanner.prescription}
          </button>

          <button
              onClick={() => setScanType('lab_result')}
              disabled={isAnalyzing}
              className={`flex-1 py-3 rounded-xl font-sans font-bold text-sm transition-all ${
                  scanType === 'lab_result'
                      ? 'bg-primary text-white shadow-md'
                      : 'text-muted hover:text-ink'
              }`}
          >
            {t.scanner.labResult}
          </button>
        </div>

        <div className="w-full flex-1 flex flex-col items-center justify-center min-h-0">
          {isAnalyzing ? (
              // Day 1 Kaiyou Deliverable: Bisaya AI Loading Screen
              <Card className="w-full aspect-[3/4] max-h-[460px] flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-white to-slate-50 border-2 border-primary/20 animate-pulse">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-6 animate-bounce">
                  <SparkleIcon className="w-8 h-8" weight="fill" />
                </div>
                <h3 className="font-sans font-bold text-lg text-ink mb-2">
                  {t.scanner.analyzing}
                </h3>
                <p className="text-xs text-muted max-w-[200px]">
                  AWS Bedrock Claude 3.5 is translating medical jargon into plain language...
                </p>
              </Card>
          ) : !capturedImage ? (
              // Viewfinder Mode
              <CameraCapture onCapture={setCapturedImage} />
          ) : (
              // Preview Mode
              <div className="w-full h-full flex flex-col items-center gap-4">
                <div className="relative w-full h-full max-h-[640px] rounded-3xl overflow-hidden border-4 border-white shadow-lg bg-black">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                      src={capturedImage}
                      alt="Captured medical document"
                      className="w-full h-full object-cover"
                  />
                </div>

                <button
                    onClick={() => setCapturedImage(null)}
                    className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-rose-600 transition-colors py-1 cursor-pointer shrink-0"
                >
                  <ArrowsClockwiseIcon className="w-4 h-4" />
                  {t.scanner.retake}
                </button>
              </div>
          )}
        </div>

        {capturedImage && !isAnalyzing && (
            <div className="w-full flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 shrink-0">
              {/* Optional symptom / condition context — powers the mismatch safety check */}
              {scanType === 'prescription' && (
                <div className="w-full flex flex-col gap-1.5">
                  <label htmlFor="symptoms" className="text-xs font-bold text-muted px-1">
                    {symptomCopy.label}
                  </label>
                  <div className="relative">
                    <textarea
                        id="symptoms"
                        value={symptoms}
                        onChange={(e) => setSymptoms(e.target.value)}
                        placeholder={symptomCopy.placeholder}
                        rows={2}
                        className="w-full rounded-2xl border border-slate-200 bg-white p-3 pr-12 text-sm text-ink resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {speechSupported && (
                        <button
                            type="button"
                            onClick={toggleListening}
                            aria-pressed={listening}
                            className={`absolute right-2 top-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                                listening
                                    ? 'bg-rose-500 text-white animate-pulse'
                                    : 'bg-slate-100 text-muted hover:bg-slate-200'
                            }`}
                        >
                          <MicrophoneIcon className="w-5 h-5" weight={listening ? 'fill' : 'regular'} />
                        </button>
                    )}
                  </div>
                </div>
              )}

              <Button
                  variant="primary"
                  size="lg"
                  className="w-full shadow-xl"
                  onClick={handleProceed}
                  iconLeft={<SparkleIcon className="w-5 h-5" weight="fill" />}
              >
                {t.scanner.proceed}
              </Button>
            </div>
        )}

      </div>
  );
}