# MedPal TTS sidecar

Standalone Node service that synthesizes **Bisaya (Cebuano)**, **Tagalog**, and
**English** speech from text using the open-source **Meta MMS-TTS** VITS models,
run on CPU via [`sherpa-onnx`](https://github.com/k2-fsa/sherpa-onnx) (no Python,
no cloud API). The MedPal Next.js app proxies to it through `/api/tts`.

> **Why a sidecar?** `sherpa-onnx` is a native addon — it can't run on Vercel
> (no custom native libs, no always-on process). Amazon Polly supports neither
> Cebuano nor Tagalog, so the existing AWS stack can't cover this. Tagalog/English
> use the browser's built-in speech synthesis when a voice exists; **Bisaya has no
> browser voice anywhere**, so it's always synthesized here.

## Setup

```bash
cd tts-service
npm install            # installs sherpa-onnx (WASM build — no native compile)

mkdir -p models && cd models

# English — available directly in the sherpa-onnx tts-models release
wget -q "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-mms-eng.tar.bz2"
tar xjf vits-mms-eng.tar.bz2 && rm vits-mms-eng.tar.bz2

# Cebuano + Tagalog — NOT in the sherpa-onnx release (it ships only a subset of
# MMS languages). Pull the sherpa-compatible ONNX conversions from the
# willwade/mms-tts-multilingual-models-onnx HuggingFace mirror instead. Their
# tokens.txt is the same `<char> <id>` MMS format sherpa-onnx expects.
HF="https://huggingface.co/willwade/mms-tts-multilingual-models-onnx/resolve/main"
for L in ceb tgl; do
  mkdir -p "vits-mms-$L"
  curl -sL "$HF/$L/model.onnx" -o "vits-mms-$L/model.onnx"
  curl -sL "$HF/$L/tokens.txt" -o "vits-mms-$L/tokens.txt"
done
cd ..
# => models/vits-mms-ceb/{model.onnx,tokens.txt}, .../vits-mms-tgl/..., .../vits-mms-eng/...

npm start              # listens on :7070 (override with PORT)
```

Each model folder contains **`model.onnx`** (~114 MB) and **`tokens.txt`** — MMS
models use only `tokens.txt` (no `dataDir`/espeak-ng dir). If a language's model
isn't present, the service logs a warning and still serves the others.

## API

| Method | Path | Body | Response |
|---|---|---|---|
| `POST` | `/synthesize` | `{ "text": string, "lang": "bisaya"\|"filipino"\|"english" }` | `200 audio/wav` bytes, or `4xx/5xx` |
| `GET` | `/health` | — | `{ "ok": true, "languages": [...] }` |

`lang` maps to a model: `bisaya → vits-mms-ceb`, `filipino → vits-mms-tgl`,
`english → vits-mms-eng`. Unknown/empty `lang` falls back to English. Set the
optional `TTS_SHARED_SECRET` env var to require an `X-TTS-Secret` header.

### Quick test (Bisaya — the hard case)

```bash
curl -s -X POST localhost:7070/synthesize \
  -H 'Content-Type: application/json' \
  -d '{"text":"Imna ang 1 ka kapsula matag 8 ka oras human sa pagkaon.","lang":"bisaya"}' \
  --output ceb.wav && afplay ceb.wav   # macOS — must produce intelligible Cebuano
```

## Env vars

| Var | Default | Purpose |
|---|---|---|
| `PORT` | `7070` | listen port |
| `TTS_SHARED_SECRET` | — | optional; if set, requests must send a matching `X-TTS-Secret` header |

The MedPal app reaches this service via `TTS_SERVICE_URL` (set in the app's
`.env.local`, e.g. `http://localhost:7070`).

## Deployment

Run on any cheap always-on box — Render / Fly.io / Railway free tier, or a $5 VPS.
For a demo, just run it locally (`npm start`) alongside `next dev`.

## License — ⚠️ non-commercial

Meta MMS-TTS models (`facebook/mms-tts-ceb|tgl|eng`, served here as the
sherpa-onnx `vits-mms-*` conversions) are **CC-BY-NC-4.0**: fine for a
school/hackathon demo, but **non-commercial use only** and **attribution
required**. Credit line:

> *Bisaya / Tagalog / English speech by Meta MMS-TTS (facebook/mms-tts-\*), CC-BY-NC-4.0 — non-commercial use only.*
