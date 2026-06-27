# Spec 03 — Multilingual Text-to-Speech (Bisaya + Tagalog + English)

## 1. Goal & Why

**Goal:** Let a patient tap a "Paminawa / Listen" button and **hear** their scan summary and each medication's instructions read aloud in their own language (Cebuano/Bisaya, Tagalog/Filipino, or English).

**Why:** MedPal targets Filipino patients, many of whom are elderly or low-literacy. A perfectly translated on-screen summary is useless to someone who cannot comfortably read it. The hard constraint is **Bisaya/Cebuano**: Amazon Polly supports neither Cebuano nor Tagalog, so we cannot reuse the existing AWS stack here. This spec adds audio with **zero new platform signups**: Tagalog/English use the browser's built-in `speechSynthesis` (free, client-side, no backend) when a `fil-PH`/`en` voice exists, and Bisaya — which has **no browser voice anywhere** — is synthesized server-side with the open-source **Meta MMS-TTS** VITS models running on CPU via `sherpa-onnx` (no Python, no cloud API).

---

## 2. Scope & File Ownership

### This spec CREATES
- `app/api/tts/route.ts` — thin auth-checked Next.js route that proxies to the sidecar and caches WAVs in Supabase Storage.
- `tts-service/` — standalone Node sidecar (its own `package.json`, NOT deployed on Vercel) that loads the three MMS VITS models and synthesizes WAV bytes. Contains at minimum: `tts-service/server.js`, `tts-service/package.json`, `tts-service/README.md`, `tts-service/models/.gitkeep` (models downloaded at setup, git-ignored).
- `components/ui/ListenButton.tsx` — reusable client button: tries Web Speech for filipino/english, else hits `/api/tts`, shows playing state, plays via a hidden `<audio>`.
- `lib/tts-normalize.ts` — text normalizer (expands `500mg` → `500 milligrams`, `x3/day` → spoken form, etc.) before synthesis.

### This spec MODIFIES (additive only)
- `app/results/[id]/page.tsx` — add **one** `<ListenButton>` next to the summary paragraph (line ~56–58 region).
- `components/ui/MedicationCard.tsx` — add **one** `<ListenButton>` in the "Directions" block (line ~100–105 region).
- `lib/dictionaries.ts` + `types/i18n.ts` — add a `results.listen` string ("Paminawa" / "Pakinggan" / "Listen"). Additive key only.
- `supabase_schema.sql` — add an idempotent storage-prefix note / no new table (caching reuses the existing `scans` bucket). See §5.
- `.env.example` + `.env.local` — add `TTS_SERVICE_URL`.
- `package.json` — **no** change to the Next.js app deps (sidecar has its own `package.json`; `sherpa-onnx` is a native addon and must NOT be a Vercel-app dependency).

### Do NOT touch (owned by other specs)
- `app/api/scan/route.ts`, `lib/prescription.ts`, `lib/bedrock.ts`, `lib/prompts.ts`, `app/scan/page.tsx` — owned by **spec-02**.
- `lib/image-preprocess.ts`, `components/camera/CameraCapture.tsx` — owned by **spec-01**.

### Seams (how this composes)
- **Reads, never writes, the scan data.** `ListenButton` receives the already-rendered `text` string as a prop from `app/results/[id]/page.tsx` (`resultData.summary`) and `MedicationCard.tsx` (`medication.instructions`). It never re-fetches or re-parses; it has no dependency on the scan pipeline's internals.
- **Language source of truth** is `useTranslation().language` from `contexts/LanguageContext.tsx` (`'bisaya' | 'filipino' | 'english'`). `ListenButton` reads it via the hook — no new language plumbing.
- **Storage seam:** the cache reuses the existing `scans` Supabase Storage bucket (created in `supabase_schema.sql`) under a separate `tts/` prefix, so no new bucket and no RLS conflict (see §5/§7).

> **Overlap risk with spec-02:** spec-02 also renders a warning/disclaimer region on `MedicationCard.tsx` and the results page. To minimize merge conflicts, this spec inserts its button **only** inside the existing "Directions" block (the `{/* Instructions */}` div at MedicationCard.tsx lines 100–105) and **only** next to the summary `<p>` on the results page (lines 56–58) — both regions are spatially distinct from the warnings box (MedicationCard lines 88–97). Keep the insertion a single self-contained JSX element so a 3-way merge resolves cleanly.

---

## 3. Prerequisites

### npm packages
- **Sidecar only** (`tts-service/package.json`): `sherpa-onnx` (Node native addon — runs pre-converted VITS ONNX models on CPU, no Python). Optionally `express` for the HTTP server (or use Node's built-in `http`). Verified: `npm i sherpa-onnx` (current major is v1.13.x as of mid-2026).
- **Next.js app:** **no new deps.** The `/api/tts` route uses only `fetch` + the existing `@/utils/supabase/server` client + `crypto` (Node built-in).

### Models (downloaded once at sidecar setup — do NOT commit; ~30–70 MB total)
From the sherpa-onnx `tts-models` release: <https://github.com/k2-fsa/sherpa-onnx/releases/tag/tts-models>
- Cebuano: `vits-mms-ceb.tar.bz2`
- Tagalog: `vits-mms-tgl.tar.bz2`
- English: `vits-mms-eng.tar.bz2`

Each archive extracts to a folder containing **`model.onnx`** and **`tokens.txt`**. **MMS models have NO `dataDir`/espeak-ng dir** (unlike Piper models) — they use only `tokens.txt`. (Verify the exact tarball names against the release page at setup; the `vits-mms-<iso>` naming is the documented convention.)

```bash
# tts-service/ setup (run once)
mkdir -p models && cd models
for L in ceb tgl eng; do
  wget -q "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mms-$L.tar.bz2"
  tar xjf "vits-mms-$L.tar.bz2" && rm "vits-mms-$L.tar.bz2"
done
# => models/vits-mms-ceb/{model.onnx,tokens.txt}, .../vits-mms-tgl/..., .../vits-mms-eng/...
```

### Env vars
| Var | Where | Value |
|---|---|---|
| `TTS_SERVICE_URL` | Next.js app | `http://localhost:7070` (dev) / sidecar public URL (deploy). **If unset, `/api/tts` returns 503 and the client silently falls back to text-only — degrade gracefully.** |
| `TTS_SHARED_SECRET` (optional) | both app + sidecar | shared bearer token so only our route can call the sidecar. |

### AWS / other specs
- **No AWS needed** for this spec (this is the whole point — Polly can't do Bisaya/Tagalog).
- **Independent of spec-01 and spec-02.** No code path here imports from the scan pipeline. If spec-02's results-page edits aren't merged yet, this spec still drops cleanly onto the current `app/results/[id]/page.tsx` shown in §1's research.

### Deployment note (sidecar)
`sherpa-onnx` is a native addon — it **cannot run on Vercel** (no custom native libs, no always-on process). Deploy `tts-service/` on a cheap always-on box: Render / Fly.io / Railway free tier, or a $5 VPS. For the demo it can simply run locally (`node server.js` on port 7070) alongside `next dev`.

---

## 4. Implementation Steps

### Step 1 — `lib/tts-normalize.ts` (text normalizer)
MMS has **no number/abbreviation normalizer**, so `"500mg"` is read letter-by-letter. Expand before synthesis. Keep it language-aware (units stay English-ish; that's acceptable and natural in PH medical speech).

```ts
// lib/tts-normalize.ts
type Lang = 'bisaya' | 'filipino' | 'english';

const UNIT: Record<string, string> = {
  mg: 'milligrams', mcg: 'micrograms', g: 'grams', ml: 'milliliters',
  iu: 'units', tab: 'tablet', tabs: 'tablets', cap: 'capsule', caps: 'capsules',
};

export function normalizeForSpeech(input: string, _lang: Lang): string {
  let t = ` ${input} `;

  // "500mg" / "500 mg" -> "500 milligrams"
  t = t.replace(/(\d+(?:\.\d+)?)\s*(mcg|mg|ml|iu|g|tabs?|caps?)\b/gi,
    (_m, n, u) => `${n} ${UNIT[u.toLowerCase()] ?? u}`);

  // "x3/day", "3x/day", "3x daily" -> "3 times per day"
  t = t.replace(/\b(?:x\s*)?(\d+)\s*x?\s*\/?\s*(?:day|daily|d)\b/gi, '$1 times per day');

  // "q8h" -> "every 8 hours";  "q.d." / "qd" -> "once a day"; "bid"->"twice a day"; "tid"->"three times a day"
  t = t.replace(/\bq\s*(\d+)\s*h\b/gi, 'every $1 hours');
  t = t.replace(/\bq\.?d\.?\b/gi, 'once a day');
  t = t.replace(/\bb\.?i\.?d\.?\b/gi, 'twice a day');
  t = t.replace(/\bt\.?i\.?d\.?\b/gi, 'three times a day');
  t = t.replace(/\bp\.?r\.?n\.?\b/gi, 'as needed');

  // collapse whitespace; strip emoji/markdown that would be spelled out
  t = t.replace(/[*_#`]/g, ' ').replace(/\s+/g, ' ').trim();
  return t;
}
```
Unit-test targets in §8.

### Step 2 — `tts-service/server.js` (sidecar)
Loads the three models once at boot, exposes `POST /synthesize { text, lang } -> audio/wav`. Map `lang -> model dir`; **`bisaya -> vits-mms-ceb`**, `filipino -> vits-mms-tgl`, `english -> vits-mms-eng`.

```js
// tts-service/server.js   (CommonJS — sherpa-onnx is a native addon)
const http = require('http');
const path = require('path');
const sherpa = require('sherpa-onnx');

const MODELS = {
  bisaya:   'vits-mms-ceb',
  filipino: 'vits-mms-tgl',
  english:  'vits-mms-eng',
};

// Build one OfflineTts per language. MMS models: NO dataDir; tokens only.
function makeTts(dir) {
  const base = path.join(__dirname, 'models', dir);
  return new sherpa.OfflineTts({
    model: {
      vits: {
        model: path.join(base, 'model.onnx'),
        tokens: path.join(base, 'tokens.txt'),
        // dataDir: '' intentionally omitted — MMS uses no espeak-ng data dir
      },
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
    },
    maxNumSentences: 1,
  });
}

const engines = Object.fromEntries(
  Object.entries(MODELS).map(([lang, dir]) => [lang, makeTts(dir)]),
);

const SECRET = process.env.TTS_SHARED_SECRET; // optional

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/synthesize') {
    res.writeHead(404); return res.end('not found');
  }
  if (SECRET && req.headers['x-tts-secret'] !== SECRET) {
    res.writeHead(401); return res.end('unauthorized');
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const { text, lang } = JSON.parse(body);
      const tts = engines[lang] || engines.english;
      if (!text || !text.trim()) { res.writeHead(400); return res.end('empty'); }

      // sherpa returns { samples: Float32Array, sampleRate }
      const audio = tts.generate({ text: String(text).slice(0, 1200), sid: 0, speed: 1.0 });
      const wav = sherpa.writeWave ? null : null; // see note below
      const buf = floatToWav(audio.samples, audio.sampleRate);
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': buf.length });
      res.end(buf);
    } catch (e) {
      console.error('tts error', e);
      res.writeHead(500); res.end('tts failed');
    }
  });
});

// Minimal 16-bit PCM WAV encoder (sherpa-onnx also ships a writeWave helper —
// prefer that if present in the installed version; this is the dependency-free fallback).
function floatToWav(samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    let s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  return buf;
}

server.listen(process.env.PORT || 7070, () =>
  console.log('TTS sidecar on :' + (process.env.PORT || 7070)));
```

> **API-name caveat:** the exact `sherpa-onnx` Node binding surface (`OfflineTts` constructor shape, `generate` vs `createOfflineTts`, and whether `writeWave` is exported) varies slightly across 1.13.x. At implementation time, mirror the official Node example at <https://github.com/k2-fsa/sherpa-onnx/tree/master/nodejs-examples> (`test-offline-tts.js`) and adjust constructor/field names to match the installed version. The `lang -> model dir` map and the WAV bytes contract above are the stable parts.

`tts-service/package.json`:
```json
{ "name": "medpal-tts-service", "private": true, "type": "commonjs",
  "scripts": { "start": "node server.js" },
  "dependencies": { "sherpa-onnx": "^1.13.0" } }
```

### Step 3 — `app/api/tts/route.ts` (auth-checked proxy + cache)
Same auth pattern as `app/api/records/[id]/route.ts` / `app/api/scan/route.ts`: `supabase.auth.getUser()` → 401 if absent. Cache by `hash(text+lang)` in the existing `scans` bucket under `tts/<hash>.wav`, so each clip is synthesized **once** across all users.

```ts
// app/api/tts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeForSpeech } from '@/lib/tts-normalize';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
  }

  const { text, lang } = await req.json();
  if (!text || !lang) {
    return NextResponse.json({ error: 'Missing text or lang', code: '400' }, { status: 400 });
  }

  const normalized = normalizeForSpeech(String(text), lang);
  const key = `tts/${crypto.createHash('sha256').update(`${lang}::${normalized}`).digest('hex')}.wav`;

  // 1. Cache hit? Serve the cached WAV via a short-lived signed URL.
  const { data: signed } = await supabase.storage.from('scans').createSignedUrl(key, 3600);
  if (signed?.signedUrl) {
    const cached = await fetch(signed.signedUrl);
    if (cached.ok) {
      return new NextResponse(await cached.arrayBuffer(),
        { headers: { 'Content-Type': 'audio/wav', 'X-TTS-Cache': 'hit' } });
    }
  }

  // 2. Miss -> call sidecar. If sidecar unreachable, 503 (client degrades to text-only).
  const base = process.env.TTS_SERVICE_URL;
  if (!base) return NextResponse.json({ error: 'TTS disabled', code: '503' }, { status: 503 });

  let wav: ArrayBuffer;
  try {
    const r = await fetch(`${base}/synthesize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.TTS_SHARED_SECRET ? { 'X-TTS-Secret': process.env.TTS_SHARED_SECRET } : {}),
      },
      body: JSON.stringify({ text: normalized, lang }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) throw new Error(`sidecar ${r.status}`);
    wav = await r.arrayBuffer();
  } catch (e) {
    console.error('TTS sidecar failed:', e);
    return NextResponse.json({ error: 'TTS unavailable', code: '503' }, { status: 503 });
  }

  // 3. Cache for next time (best-effort; upsert under the system 'tts/' prefix).
  await supabase.storage.from('scans')
    .upload(key, Buffer.from(wav), { contentType: 'audio/wav', upsert: true })
    .catch(() => {});

  return new NextResponse(wav, { headers: { 'Content-Type': 'audio/wav', 'X-TTS-Cache': 'miss' } });
}
```

> **RLS note for the `tts/` prefix:** existing storage policies in `supabase_schema.sql` scope writes to `(storage.foldername(name))[1] = auth.uid()::text`. The `tts/<hash>.wav` key's first folder segment is `tts`, **not** a uid, so the anon-key client would be blocked. Two options (pick one in §5): **(A)** loosen policy to also allow the `tts/` prefix for any authenticated user (shared cache — fine, clips are non-PHI generic medication text), or **(B)** key per-user as `<user.id>/tts/<hash>.wav` (works under current policy, but no cross-user cache reuse). **Recommended: (A)** for true synthesize-once.

### Step 4 — `components/ui/ListenButton.tsx`
Client component. Tries Web Speech for `filipino`/`english` if a matching voice exists; otherwise (always for `bisaya`) hits `/api/tts`. Plays via a hidden `<audio>`; shows playing state. Uses the existing `Button` look or a compact icon button (Phosphor `SpeakerHighIcon` / `StopIcon`).

```tsx
// components/ui/ListenButton.tsx
"use client";
import React, { useRef, useState } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';
import { SpeakerHighIcon, StopIcon, SpinnerGapIcon } from '@phosphor-icons/react';

function pickWebVoice(lang: 'filipino' | 'english') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const want = lang === 'filipino' ? ['fil', 'tl'] : ['en'];
  const voices = window.speechSynthesis.getVoices();
  return voices.find(v => want.some(p => v.lang?.toLowerCase().startsWith(p))) ?? null;
}

export function ListenButton({ text, compact = false }: { text: string; compact?: boolean }) {
  const { language, t } = useTranslation();
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stop = () => {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
    setState('idle');
  };

  const play = async () => {
    if (state === 'playing' || state === 'loading') return stop();

    // Web Speech fast path — filipino/english only (never bisaya: no browser voice exists)
    if (language !== 'bisaya') {
      const voice = pickWebVoice(language);
      if (voice) {
        const u = new SpeechSynthesisUtterance(text);
        u.voice = voice; u.lang = voice.lang; u.rate = 0.9;
        u.onend = () => setState('idle'); u.onerror = () => setState('idle');
        setState('playing'); window.speechSynthesis.cancel(); window.speechSynthesis.speak(u);
        return;
      }
    }

    // Server MMS path (bisaya always; filipino/english when no browser voice)
    try {
      setState('loading');
      const res = await fetch('/api/tts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang: language }),
      });
      if (!res.ok) { setState('idle'); return; }            // graceful: silently no-op (e.g. 503)
      const url = URL.createObjectURL(await res.blob());
      const a = audioRef.current ?? new Audio();
      audioRef.current = a; a.src = url;
      a.onended = () => { setState('idle'); URL.revokeObjectURL(url); };
      a.onerror = () => setState('idle');
      setState('playing'); await a.play();
    } catch { setState('idle'); }
  };

  const label = (t as any).results?.listen ?? 'Listen';
  const Icon = state === 'loading' ? SpinnerGapIcon : state === 'playing' ? StopIcon : SpeakerHighIcon;

  return (
    <button type="button" onClick={play} aria-label={label}
      className={compact
        ? "inline-flex items-center gap-1.5 text-xs font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg active:scale-95 transition"
        : "inline-flex items-center gap-1.5 text-sm font-bold text-[#2B4BFF] bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl active:scale-95 transition"}>
      <Icon className={`w-4 h-4 ${state === 'loading' ? 'animate-spin' : ''}`} weight="fill" />
      <span>{state === 'playing' ? '■' : label}</span>
    </button>
  );
}
```
> **Voice-list timing:** `getVoices()` is empty on first paint in some browsers; subscribe once to `window.speechSynthesis.onvoiceschanged` (a tiny `useEffect` that forces a re-render flag) so the filipino/english fast path is detected after voices load. If still empty at click time, the code already falls through to the server path — safe default.

### Step 5 — Wire the button into the two views (additive)
`app/results/[id]/page.tsx`, summary block (current lines 56–58):
```tsx
{/* 1. Dynamic Summary (From AI) */}
<div className="flex items-start justify-between gap-3 px-2">
  <p className="text-sm text-muted font-medium">{resultData.summary}</p>
  <ListenButton text={resultData.summary} />
</div>
```
`components/ui/MedicationCard.tsx`, Directions block (current lines 100–105):
```tsx
{/* Instructions */}
<div className="flex flex-col gap-1 pt-1">
  <div className="flex items-center justify-between">
    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Directions</span>
    <ListenButton compact text={medication.instructions} />
  </div>
  <p className="text-sm text-slate-600 leading-relaxed font-medium">{medication.instructions}</p>
</div>
```
Add `import { ListenButton } from '@/components/ui/ListenButton';` to both files.

### Step 6 — i18n string
`types/i18n.ts`, extend the `results` block:
```ts
results: {
  drugLabel: string; quantityLabel: string; saveToRecords: string;
  setReminders: string; saving: string; listen: string;   // NEW
};
```
`lib/dictionaries.ts`, add `listen` to each `results` object: english `'Listen'`, filipino `'Pakinggan'`, bisaya `'Paminawa'`.

---

## 5. Data Model & API Changes

### No new DB table.
TTS clips are cached as files in the existing `scans` Supabase Storage bucket under the `tts/` prefix, keyed by `sha256(lang + '::' + normalizedText)`. No `medications`/`scans` columns change.

### `supabase_schema.sql` edit — storage policy for the shared `tts/` cache (idempotent)
Add after the existing `scans_storage_*` policies:
```sql
-- ── TTS audio cache (shared, non-PHI synthesized medication speech) ─────────
-- Generated WAVs live under the 'tts/' prefix of the 'scans' bucket and are
-- keyed by sha256(lang+text), so they're shared across users (synthesize once).
drop policy if exists scans_storage_tts_select on storage.objects;
create policy scans_storage_tts_select on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = 'tts');
drop policy if exists scans_storage_tts_insert on storage.objects;
create policy scans_storage_tts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = 'tts');
```
**Idempotent ALTER for the live DB:** the two `drop policy if exists … / create policy …` statements above are themselves idempotent — paste them straight into the Supabase SQL Editor; no table ALTER is needed.

> If you instead chose per-user keys (`<user.id>/tts/<hash>.wav`, option B in §3), **skip this SQL entirely** — the existing uid-scoped policies already cover it, at the cost of no cross-user cache sharing.

### API: `POST /api/tts`
**Request:** `{ "text": string, "lang": "bisaya" | "filipino" | "english" }`
**Auth:** Supabase session cookie (anonymous sign-in is fine), else `401`.
**Responses:**
- `200` `Content-Type: audio/wav` — WAV bytes. Header `X-TTS-Cache: hit|miss`.
- `400` `{ error, code: '400' }` — missing `text`/`lang`.
- `503` `{ error, code: '503' }` — sidecar unreachable or `TTS_SERVICE_URL` unset (client degrades silently to text-only).

### Sidecar: `POST {TTS_SERVICE_URL}/synthesize`
**Request:** `{ "text": string, "lang": string }` (+ optional `X-TTS-Secret` header).
**Response:** `200 audio/wav` bytes, or `4xx/5xx` on error.

### `.env.example` additions
```
# TTS sidecar (optional — omit to disable Listen buttons; app degrades to text-only)
TTS_SERVICE_URL=http://localhost:7070
# TTS_SHARED_SECRET=
```

---

## 6. UI / UX

- **Component:** `ListenButton` — a small blue pill (matches MedicationCard's existing `#2B4BFF` dosage pill styling) with a Phosphor speaker icon + the localized label. `compact` variant for inside cards.
- **States:** idle (speaker icon + label), loading (spinner, for the server path while the WAV is fetched/synthesized), playing (stop icon; tapping again stops). Only one clip plays at a time per button; starting a new one cancels prior speech (`speechSynthesis.cancel()` / `audio.pause()`).
- **Placements:**
  1. Results page — next to the AI summary paragraph (hear the whole summary).
  2. Each `MedicationCard` — in the "Directions" header row (hear that drug's instructions).
- **Language handling:** label and synthesis follow `useTranslation().language`. `bisaya` → always server MMS (`vits-mms-ceb`). `filipino`/`english` → Web Speech `fil-PH`/`en` voice if present (instant, offline, zero backend), else server MMS (`vits-mms-tgl`/`vits-mms-eng`). The button text uses the new `t.results.listen` key (Paminawa / Pakinggan / Listen).
- **Accessibility:** `aria-label` is the localized "Listen"; the control is keyboard-focusable (`<button>`). Larger tap target via the pill padding suits elderly users; the whole feature exists for the low-literacy audience.

---

## 7. Safety & Edge Cases

- **Audio is an accessibility aid, not medical advice.** The on-screen `DisclaimerBanner` still governs; TTS reads back *exactly* the already-validated `summary`/`instructions` text — it never generates or rephrases content, so it introduces **no new hallucination surface**.
- **`readable: false` path is upstream and unaffected.** `/api/scan` already blocks unreadable scans before any results page renders (`route.ts` lines 64–69, returns "ask your pharmacist"). `ListenButton` only ever receives text from a scan that already passed `readable === true`, so there is nothing to speak for the unreadable case — no special handling needed here, and importantly the button must **not** be shown on the scan/error screens (only on results/records).
- **Normalizer is conservative.** `lib/tts-normalize.ts` only expands well-known unit/frequency tokens and strips markup; it never invents drug names or dosages. A number it doesn't recognize is read as-is — acceptable.
- **Language fallback chain:** unknown/empty `lang` → sidecar defaults to `english` engine; missing browser voice → server path; sidecar down / `TTS_SERVICE_URL` unset → `503` → button silently no-ops (text remains fully readable on screen). No dead-ends.
- **Licensing — CC-BY-NC-4.0.** Meta MMS-TTS models (`facebook/mms-tts-ceb|tgl|eng`, served here as the sherpa-onnx `vits-mms-*` conversions) are **CC-BY-NC-4.0**. This is fine for a school hackathon/demo but **blocks commercial use** and **requires attribution**. Add to `tts-service/README.md` and the app's About/credits: *"Bisaya/Tagalog/English speech by Meta MMS-TTS (facebook/mms-tts-*), CC-BY-NC-4.0 — non-commercial use only."* Web Speech voices are the OS/browser's own (no licensing burden on us).
- **PHI / privacy:** the cached text is generic medication instruction/summary text keyed by content hash — not tied to a patient identity in the filename. Still, it lives in the private (`public=false`) `scans` bucket and is only reachable via signed URLs minted server-side after auth. Do not log the full `text` in the sidecar in production.
- **Cost/abuse:** cap `text` length server-side (route slices implicitly via normalizer; sidecar slices to 1200 chars). Caching means repeat plays cost zero synthesis.

---

## 8. Testing & Acceptance Criteria

**No AWS required for any of this.**

### Sidecar (Bisaya — the hard case)
1. `cd tts-service && npm i && npm start` (after model download).
2. ```bash
   curl -s -X POST localhost:7070/synthesize \
     -H 'Content-Type: application/json' \
     -d '{"text":"Imna ang 1 ka kapsula matag 8 ka oras human sa pagkaon.","lang":"bisaya"}' \
     --output ceb.wav && afplay ceb.wav   # (macOS) — must produce intelligible Cebuano speech
   ```
   **Pass:** a non-empty WAV that audibly reads the Cebuano sentence.

### Normalizer (`lib/tts-normalize.ts`)
- `normalizeForSpeech('Take 500mg x3/day', 'english')` → contains `500 milligrams` and `3 times per day`.
- `normalizeForSpeech('1 cap q8h prn', 'english')` → `1 capsule every 8 hours as needed`.
- `normalizeForSpeech('**bold** _x_', 'bisaya')` → no `*`/`_` characters remain.

### Route + cache (`/api/tts`)
1. `TTS_SERVICE_URL=http://localhost:7070 npm run dev`, sign in (anon), open a scan's results page.
2. Tap **Paminawa** on a Bisaya summary → audio plays. Network tab: first call `X-TTS-Cache: miss`.
3. Tap again (or reload + tap) → `X-TTS-Cache: hit`, **and the sidecar logs no new `/synthesize` call** → confirms synthesize-once caching. **Pass = no duplicate synthesis.**
4. Unauthenticated `POST /api/tts` → `401`.
5. Stop the sidecar, tap Listen → route returns `503`, button returns to idle, **on-screen text unaffected** → graceful degradation.

### Web Speech fast path (Tagalog/English)
6. On updated Android Chrome with `language='filipino'` and a `fil-PH` voice installed: tap Listen → **no `/api/tts` network call** (DevTools confirms), speech plays via `speechSynthesis`. On a desktop without a `fil` voice → it falls through to `/api/tts` (server `vits-mms-tgl`). **Pass:** correct path chosen per voice availability.

### Non-regression
7. With `TTS_SERVICE_URL` unset, the results page and MedicationCards render and function exactly as before; Listen buttons are present but no-op on tap (503). No console errors block render.

---

## 9. Out of Scope / Future

- Streaming/partial audio, word-level highlight-as-it-reads, playback speed control UI.
- Caching as a DB-tracked table with TTL eviction (current: bucket files, no eviction).
- A higher-quality / commercially-licensed Cebuano voice (MMS is CC-BY-NC). Revisit if MedPal ever goes commercial.
- Per-medication "read everything on this card" (currently summary + per-card instructions only).
- Offline (PWA) caching of generated WAVs on-device.
- Tagalog/Cebuano **number** normalization into native words (current normalizer keeps English unit words, which is idiomatic in PH medical speech).

---

## 10. Parallel-Execution Notes

- **Runs concurrently with spec-01 (image preprocessing)** — zero file overlap; spec-01 touches the capture/preprocess path, this spec touches the results/records display + a new route + a new folder.
- **Runs concurrently with spec-02 (scan pipeline / Bedrock vision)** — this spec imports **nothing** from `lib/prescription.ts` / `lib/bedrock.ts` / `lib/prompts.ts` / `app/api/scan/route.ts` / `app/scan/page.tsx`, and only **reads** the rendered string props on the results page and MedicationCard.
- **Only contact point with spec-02** is the two additive JSX insertions in `app/results/[id]/page.tsx` and `components/ui/MedicationCard.tsx`. Conflict is minimized by confining edits to the summary `<p>` region and the "Directions" block respectively — both spatially separate from spec-02's warning/disclaimer region (MedicationCard lines 88–97). If both specs edit MedicationCard, expect at most a trivial 3-way merge in the Directions block; the `ListenButton` insertion is one self-contained element.
- **`lib/dictionaries.ts` / `types/i18n.ts`** are shared additive-only edits (new `results.listen` key). Multiple specs appending distinct keys merge cleanly; if a conflict arises it's a one-line addition per language block.
- **No shared runtime state, no shared env vars** with other specs (this spec's only new env is `TTS_SERVICE_URL` / `TTS_SHARED_SECRET`). The sidecar is a separate process/repo-folder with its own `package.json`, so it cannot break the Next.js build.
