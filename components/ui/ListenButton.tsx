"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { SpeakerHighIcon, StopIcon, SpinnerGapIcon, WarningIcon } from '@phosphor-icons/react';

// A 1-sample silent WAV. Played inside the click to "unlock" the <audio>
// element on iOS / macOS Safari, which reject play() that runs after an await
// (i.e. our fetch) because it's outside the synchronous user-gesture window.
const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';

// Pick a browser speech-synthesis voice for the language, if one exists.
// Never used for bisaya — no browser has a Cebuano voice, so that always goes
// to the server MMS path.
function pickWebVoice(lang: 'filipino' | 'english'): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const want = lang === 'filipino' ? ['fil', 'tl'] : ['en'];
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => want.some((p) => v.lang?.toLowerCase().startsWith(p))) ?? null;
}

export function ListenButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const { language, t } = useTranslation();
  const [state, setState] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // getVoices() is empty on first paint in some browsers; bump this once voices
  // load so the filipino/english fast path can be detected at click time.
  const [, setVoicesReady] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const onVoices = () => setVoicesReady((n) => n + 1);
    window.speechSynthesis.addEventListener?.('voiceschanged', onVoices);
    return () => window.speechSynthesis.removeEventListener?.('voiceschanged', onVoices);
  }, []);

  const stop = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setState('idle');
  };

  const play = async () => {
    if (state === 'playing' || state === 'loading') return stop();

    // Web Speech fast path — filipino/english only (never bisaya: no browser voice).
    if (language !== 'bisaya') {
      const voice = pickWebVoice(language);
      if (voice) {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = 0.9;
        u.onend = () => setState('idle');
        u.onerror = () => setState('idle');
        setState('playing');
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(u);
        return;
      }
    }

    // Server MMS path (bisaya always; filipino/english when no browser voice).
    // Unlock the <audio> element *inside* the click before we await the fetch —
    // iOS/Safari otherwise reject the post-await play() as non-user-initiated.
    const a = audioRef.current ?? new Audio();
    audioRef.current = a;
    a.src = SILENT_WAV;
    a.play().catch(() => {}); // claims user-gesture activation; safe if it rejects

    const fail = (msg: string) => {
      console.error(`[tts] ${msg} (lang=${language})`);
      setState('error');
      setTimeout(() => setState((s) => (s === 'error' ? 'idle' : s)), 2500);
    };

    try {
      setState('loading');
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: language }),
      });
      if (!res.ok) {
        // 503 = sidecar unreachable / TTS_SERVICE_URL unset (common on deploys
        // where the localhost sidecar isn't reachable). Surface it, don't hide it.
        fail(`/api/tts returned ${res.status}`);
        return;
      }
      const url = URL.createObjectURL(await res.blob());
      a.src = url;
      a.onended = () => {
        setState('idle');
        URL.revokeObjectURL(url);
      };
      a.onerror = () => fail('audio element error');
      setState('playing');
      await a.play();
    } catch (e) {
      fail(`playback failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const label = t.results.listen;
  const Icon =
    state === 'loading' ? SpinnerGapIcon
    : state === 'playing' ? StopIcon
    : state === 'error' ? WarningIcon
    : SpeakerHighIcon;

  return (
    <button
      type="button"
      onClick={play}
      aria-label={label}
      className={compact
        ? "inline-flex items-center gap-1.5 text-xs font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg active:scale-95 transition shrink-0"
        : "inline-flex items-center gap-1.5 text-sm font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl active:scale-95 transition shrink-0"}>
      <Icon className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} weight="fill" />
      <span>{state === 'playing' ? t.results.stop : label}</span>
    </button>
  );
}
