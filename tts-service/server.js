// tts-service/server.js   (CommonJS — sherpa-onnx is a native addon)
//
// Standalone TTS sidecar for MedPal. Loads Meta MMS-TTS VITS models (Cebuano,
// Tagalog, English) once at boot and exposes POST /synthesize { text, lang }
// -> audio/wav. NOT deployed on Vercel — run it on an always-on box / locally.
//
// lang -> model dir:  bisaya -> vits-mms-ceb, filipino -> vits-mms-tgl,
//                     english -> vits-mms-eng.
const http = require('http');
const path = require('path');
const fs = require('fs');
const sherpa = require('sherpa-onnx');

const MODELS = {
  bisaya: 'vits-mms-ceb',
  filipino: 'vits-mms-tgl',
  english: 'vits-mms-eng',
};

// Build one OfflineTts per language. MMS models: tokens only, NO dataDir
// (unlike Piper, MMS uses no espeak-ng data dir).
function makeTts(dir) {
  const base = path.join(__dirname, 'models', dir);
  const model = path.join(base, 'model.onnx');
  const tokens = path.join(base, 'tokens.txt');
  if (!fs.existsSync(model) || !fs.existsSync(tokens)) {
    throw new Error(`missing model.onnx/tokens.txt in models/${dir} (download it — see README.md)`);
  }
  // sherpa-onnx 1.13.x config shape (verified against the installed binding):
  // offlineTtsModelConfig.offlineTtsVitsModelConfig. MMS models use tokens only —
  // dataDir stays empty (no espeak-ng data dir, unlike Piper).
  const config = {
    offlineTtsModelConfig: {
      offlineTtsVitsModelConfig: { model, tokens, dataDir: '' },
      numThreads: 1,
      provider: 'cpu',
      debug: 0,
    },
    maxNumSentences: 1,
  };
  if (typeof sherpa.createOfflineTts === 'function') return sherpa.createOfflineTts(config);
  if (typeof sherpa.OfflineTts === 'function') return new sherpa.OfflineTts(config);
  throw new Error('sherpa-onnx: no createOfflineTts/OfflineTts export found — check the installed version');
}

// Load each language; skip (with a warning) any whose model isn't downloaded yet
// so the service still serves the languages that ARE present.
const engines = {};
for (const [lang, dir] of Object.entries(MODELS)) {
  try {
    engines[lang] = makeTts(dir);
    console.log(`[tts] loaded ${lang} (${dir})`);
  } catch (e) {
    console.warn(`[tts] skipped ${lang}: ${e.message}`);
  }
}
if (Object.keys(engines).length === 0) {
  console.error('[tts] no models loaded — download them into models/ (see README.md). Exiting.');
  process.exit(1);
}

const SECRET = process.env.TTS_SHARED_SECRET; // optional shared bearer

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, languages: Object.keys(engines) }));
  }
  if (req.method !== 'POST' || req.url !== '/synthesize') {
    res.writeHead(404);
    return res.end('not found');
  }
  if (SECRET && req.headers['x-tts-secret'] !== SECRET) {
    res.writeHead(401);
    return res.end('unauthorized');
  }
  let body = '';
  req.on('data', (c) => (body += c));
  req.on('end', () => {
    try {
      const { text, lang } = JSON.parse(body || '{}');
      if (!text || !String(text).trim()) {
        res.writeHead(400);
        return res.end('empty');
      }
      // Unknown/empty lang -> english fallback; if english isn't loaded either,
      // use whatever engine is available.
      const tts = engines[lang] || engines.english || Object.values(engines)[0];

      // sherpa returns { samples: Float32Array, sampleRate }
      const audio = tts.generate({ text: String(text).slice(0, 1200), sid: 0, speed: 1.0 });
      const buf = floatToWav(audio.samples, audio.sampleRate);
      res.writeHead(200, { 'Content-Type': 'audio/wav', 'Content-Length': buf.length });
      res.end(buf);
    } catch (e) {
      console.error('[tts] synth error:', e.message);
      res.writeHead(500);
      res.end('tts failed');
    }
  });
});

// Minimal dependency-free 16-bit PCM WAV encoder. Returns a Buffer directly
// (no temp file), which is exactly the HTTP response body we need.
function floatToWav(samples, sampleRate) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8);
  buf.write('fmt ', 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22); buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, 44 + i * 2);
  }
  return buf;
}

const PORT = process.env.PORT || 7070;
server.listen(PORT, () => console.log(`[tts] sidecar on :${PORT}`));
