"use client";

import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { SpeakerHighIcon, StopIcon } from '@phosphor-icons/react';

// MVP: always read aloud with the browser's built-in English voice, regardless
// of the selected language. Bisaya/Tagalog text gets an English accent, but it
// works on every device with ZERO backend — no TTS sidecar, no network call —
// exactly like the English path always has. To restore per-language voices,
// re-wire the server MMS path (see tts-service/ and app/api/tts/route.ts).
function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang?.toLowerCase().startsWith('en')) ?? null;
}

export function ListenButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'playing'>('idle');
  // getVoices() is empty on first paint in some browsers; bump this once voices
  // load so an English voice can be picked at click time.
  const [, setVoicesReady] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const onVoices = () => setVoicesReady((n) => n + 1);
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
  }, []);

  const stop = () => {
    window.speechSynthesis?.cancel();
    setState('idle');
  };

  const play = () => {
    if (state === 'playing') return stop();
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const u = new SpeechSynthesisUtterance(text);
    const voice = pickEnglishVoice();
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = 'en-US'; // fall back to the browser's default English voice
    }
    u.rate = 0.9; // slightly slower — these are medical instructions
    u.onend = () => setState('idle');
    u.onerror = () => setState('idle');
    setState('playing');
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  const label = t.results.listen;
  const Icon = state === 'playing' ? StopIcon : SpeakerHighIcon;

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      className={compact
        ? "inline-flex items-center gap-1.5 text-xs font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg active:scale-95 transition shrink-0"
        : "inline-flex items-center gap-1.5 text-sm font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl active:scale-95 transition shrink-0"}>
      <Icon className="w-4 h-4" weight="fill" />
      <span>{state === 'playing' ? t.results.stop : label}</span>
    </button>
  );
}
