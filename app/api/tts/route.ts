// app/api/tts/route.ts
// Auth-checked proxy to the TTS sidecar with a synthesize-once cache in the
// existing `scans` Supabase Storage bucket (under the shared `tts/` prefix).
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { normalizeForSpeech } from '@/lib/tts-normalize';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // 1. Session authentication (same pattern as /api/scan).
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
  }

  const { text, lang } = await req.json();
  if (!text || !lang) {
    return NextResponse.json({ error: 'Missing text or lang', code: '400' }, { status: 400 });
  }

  const normalized = normalizeForSpeech(String(text), lang);
  if (!normalized) {
    return NextResponse.json({ error: 'Missing text or lang', code: '400' }, { status: 400 });
  }

  // Cache key: shared across all users — clips are non-PHI generic medication text.
  const key = `tts/${crypto.createHash('sha256').update(`${lang}::${normalized}`).digest('hex')}.wav`;

  // 2. Cache hit? Serve the cached WAV via a short-lived signed URL.
  const { data: signed } = await supabase.storage.from('scans').createSignedUrl(key, 3600);
  if (signed?.signedUrl) {
    const cached = await fetch(signed.signedUrl);
    if (cached.ok) {
      return new NextResponse(await cached.arrayBuffer(),
        { headers: { 'Content-Type': 'audio/wav', 'X-TTS-Cache': 'hit' } });
    }
  }

  // 3. Miss -> call sidecar. If unconfigured/unreachable, 503 (client degrades to text-only).
  const base = process.env.TTS_SERVICE_URL;
  if (!base) {
    return NextResponse.json({ error: 'TTS disabled', code: '503' }, { status: 503 });
  }

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

  // 4. Cache for next time (best-effort under the shared `tts/` prefix).
  // Note: storage.upload() returns { error } rather than throwing, so check it.
  const { error: uploadError } = await supabase.storage.from('scans')
    .upload(key, Buffer.from(wav), { contentType: 'audio/wav', upsert: true });
  if (uploadError) console.error('TTS cache upload failed:', uploadError);

  return new NextResponse(wav, { headers: { 'Content-Type': 'audio/wav', 'X-TTS-Cache': 'miss' } });
}
