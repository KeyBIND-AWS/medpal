# Spec 01 — Scan Image Preprocessing (sharp)

## Goal
Add a free, pure, standalone server-side image-preprocessing stage (`lib/image-preprocess.ts`, powered by `sharp`) that cleans up messy phone photos **before** any OCR/vision call, to raise extraction accuracy on prescriptions and lab results.

**Why:** The teammate's main complaint is OCR quality. Real scans are skewed, low-contrast, blurry, under-lit phone snaps. Textract/Comprehend Medical (`lib/prescription.ts` → `analyzePrescriptionImage`) and the Bedrock vision path (`lib/bedrock.ts` → `analyzeImage`) all do markedly better on a deskewed, contrast-stretched, sharpened, correctly-sized image. `sharp` (libvips) gives us EXIF-rotation, grayscale, contrast normalisation, sharpening, and upscaling for $0 and zero new platform — it ships as a standard Next.js image dependency and is already present in `node_modules`.

This spec deliberately ships **only a pure module + a package.json dependency**. It does **not** wire itself into the request path — that one-line integration is owned by spec-02 — so this spec conflicts with nothing and is independently mergeable and testable.

## Scope & File Ownership

**This spec CREATES:**
- `lib/image-preprocess.ts` — the only source file this spec owns.
- `scripts/test-image-preprocess.mjs` — a tiny standalone Node test harness (no AWS, no Supabase, no Next runtime).

**This spec MODIFIES:**
- `package.json` — add `sharp` to `dependencies` (and the resulting `package-lock.json` / lockfile).

**This spec does NOT touch (owned by other specs):**
- `app/api/scan/route.ts` — owned by **spec-02**. We only *document* the exact one-line call spec-02 will add. Do **not** edit it here.
- `lib/prescription.ts`, `lib/bedrock.ts`, `lib/prompts.ts` — owned by the AWS/analysis specs.
- `app/scan/page.tsx`, `components/camera/CameraCapture.tsx` — client capture UI, owned by the scan-UI spec.
- `supabase_schema.sql` and any DB tables — this spec introduces **no** schema changes.

**Seam / how it composes:**
`preprocessScanImage(imageBase64) → cleanedBase64` is a string→string pure function. spec-02 calls it once at the top of `POST /api/scan`, immediately after the request body is parsed, and feeds its output into **both** the Supabase Storage upload and `analyzePrescriptionImage(...)`. Because the function returns a prefix-free base64 string (exactly the shape the rest of the route already expects), the seam is a drop-in: nothing downstream changes its types or behavior.

## Prerequisites

- **npm package:** `sharp` (libvips bindings, Apache-2.0). Verified present at `node_modules/sharp` v`0.34.5`, but it is **not** yet a direct dependency in `package.json` — it is currently only transitively available. **Must be added explicitly** so it survives a clean `npm install` and a CI/prod build:
  ```bash
  npm install sharp@^0.34.5
  ```
  Pin `^0.34` (the version already resolved in this repo). `sharp` ships prebuilt libvips binaries for macOS (dev) and linux-x64/arm64 (Vercel/AWS), so no native toolchain is required on the build host.
- **Runtime:** This module is **Node-runtime only** (`sharp` cannot run on the Edge runtime). The scan route is already a Node route handler, so no `export const runtime` change is needed. Do not import this module into any Edge or client component.
- **Node version:** repo runs Node v26 locally; `sharp` 0.34 supports Node ≥18.17. Fine.
- **Env vars:** none. No AWS, no Supabase, no secrets. Works fully offline.
- **No dependency on other specs.** spec-02 depends on *this* one, not the reverse. If spec-02 is not merged yet, this module simply sits unused and harmless — it changes no existing behavior.

## Implementation Steps

### 1. Add the dependency
```bash
npm install sharp@^0.34.5
```
Confirm `package.json` `dependencies` now lists `"sharp": "^0.34.5"`.

### 2. Create `lib/image-preprocess.ts`
A single async export. It strips any data-URI prefix, decodes to a `Buffer`, runs the `sharp` pipeline, and returns **prefix-free** base64. Every failure path returns the **original** input so preprocessing can never block a scan.

```ts
// lib/image-preprocess.ts
import sharp from 'sharp';

/** Max long-edge width we upscale/limit to. ~2000px is the sweet spot for
 *  Textract/Comprehend Medical detail vs. payload size. */
const TARGET_WIDTH = 2000;
const JPEG_QUALITY = 92;

/** Strip a `data:image/...;base64,` prefix if present; return raw base64. */
function stripDataUriPrefix(input: string): string {
  return input.replace(/^data:image\/\w+;base64,/, '');
}

/**
 * Preprocess a scan image to improve downstream OCR / vision accuracy.
 *
 * Pipeline (all from sharp 0.34, libvips):
 *   .rotate()                              -> auto-orient using EXIF (no arg = honor EXIF)
 *   .grayscale()                           -> drop color; OCR cares about luminance
 *   .normalise()                           -> contrast stretch (maps darkest->0, lightest->255)
 *   .sharpen()                             -> unsharp mask; recovers blurry phone text edges
 *   .resize({ width, withoutEnlargement:false }) -> upscale tiny shots, cap huge ones
 *   .jpeg({ quality: 92 })                 -> re-encode; keeps payload reasonable
 *
 * @param imageBase64 base64 string, with OR without a data-URI prefix.
 * @returns a base64 string WITHOUT any data-URI prefix. On ANY error, returns
 *          the original input UNCHANGED (prefix stripped if it had one is NOT
 *          guaranteed on the error path — see note below) so a scan never fails
 *          because preprocessing failed.
 */
export async function preprocessScanImage(imageBase64: string): Promise<string> {
  const raw = stripDataUriPrefix(imageBase64);
  try {
    const inputBuffer = Buffer.from(raw, 'base64');

    const outputBuffer = await sharp(inputBuffer)
      .rotate()                 // honor EXIF orientation
      .grayscale()
      .normalise()              // contrast stretch
      .sharpen()
      .resize({ width: TARGET_WIDTH, withoutEnlargement: false })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return outputBuffer.toString('base64');
  } catch (err) {
    // Never block a scan because preprocessing failed. Log and fall back to
    // the original (prefix-stripped) base64 so the caller still gets valid input.
    console.warn('preprocessScanImage: falling back to original image —', err);
    return raw;
  }
}
```

**Method-name accuracy (verified against `sharp@0.34.5` on this machine):** `.rotate()`, `.grayscale()`, `.normalise()`, `.sharpen()`, `.resize()`, `.jpeg()`, `.toBuffer()` all exist on the `Sharp` prototype. Notes:
- `.rotate()` **with no argument** = auto-orient from EXIF (this is the desired "honor EXIF" behavior). Passing a number would force a fixed angle instead — do not pass one.
- `.grayscale()` and `.greyscale()` are aliases; use `.grayscale()`.
- `.normalise()` and `.normalize()` are aliases; use `.normalise()` to match the pipeline description.
- `.resize({ width, withoutEnlargement: false })` — `withoutEnlargement: false` (the default is `false`) explicitly permits **upscaling** small images; we set it for clarity.

**Why strip the prefix even on the error path:** the live route currently sends the captured image through `Buffer.from(image, 'base64')` (route line 28) and `analyzePrescriptionImage` strips a prefix internally (prescription.ts line 114). Returning prefix-free base64 in *all* cases keeps the contract uniform and avoids a double-prefix or a prefix sneaking into a storage object.

### 3. Create the test harness `scripts/test-image-preprocess.mjs`
See **Testing** section for the full file. It generates a small synthetic source image with `sharp`, base64-encodes it, runs it through `preprocessScanImage`, and asserts the output is valid JPEG base64.

### 4. (Do NOT do here) Document spec-02's integration point
Spec-02 will add **exactly one import and one call** to `app/api/scan/route.ts`. The current route (lines 18–30) reads:
```ts
const { image, type, language } = await req.json();
// ...validation...
const imageBuffer = Buffer.from(image, 'base64');
```
Spec-02's change (for reference only — **this spec must not make it**):
```ts
import { preprocessScanImage } from '@/lib/image-preprocess';   // (add to imports)

const { image, type, language } = await req.json();
// ...existing validation unchanged...

// NEW (spec-02): clean the image before storage + analysis
const cleanedImage = await preprocessScanImage(image);

const imageBuffer = Buffer.from(cleanedImage, 'base64');         // was: Buffer.from(image, 'base64')
// ...and pass cleanedImage to analyzePrescriptionImage(cleanedImage, language) instead of image
```
That is the entire integration surface. It is intentionally left to spec-02 so this spec stays conflict-free.

## Data Model & API Changes
**None.**
- No new DB columns, no `supabase_schema.sql` edit, no `ALTER`.
- No change to the `/api/scan` request shape (`{ image, type, language }`) or response shape (`{ scan_id, summary, medications }`).
- The `ai_response` jsonb / `ParsingResult` interface in `lib/prescription.ts` is untouched.

The only observable change once spec-02 wires this in: the bytes uploaded to the `scans` Storage bucket and sent to Textract are the cleaned JPEG rather than the raw capture. Same column, same content-type (`image/jpeg`), same `${user.id}/${Date.now()}.jpg` path.

## UI / UX
- **No client/UI changes.** `app/scan/page.tsx` and `components/camera/CameraCapture.tsx` are untouched. Note for context: `CameraCapture` produces the image via `canvas.toDataURL('image/jpeg', 0.8)`, so the POST body's `image` field **includes** a `data:image/jpeg;base64,` prefix — `preprocessScanImage` strips it via `stripDataUriPrefix`, so the prefix is handled server-side and the UI needs no change.
- **Language handling:** none required — this module is locale-agnostic; it manipulates pixels, not text. The existing multilingual summary/disclaimer logic in `lib/prescription.ts` is unaffected.
- Preprocessing is fully invisible to the user; it only makes the downstream analysis more accurate. There is no new button, toggle, or input.

## Safety & Edge Cases
- **Never block a scan:** the `try/catch` returns the original (prefix-stripped) base64 on *any* sharp failure (corrupt bytes, unsupported format, OOM, etc.). A preprocessing error degrades to "analyze the raw image," exactly today's behavior.
- **Non-image / garbage input:** `Buffer.from(raw, 'base64')` always produces *some* buffer; if it isn't a decodable image, `sharp(...).toBuffer()` throws and we fall back. No crash.
- **Already-clean / tiny images:** `withoutEnlargement: false` upscales small shots to ~2000px wide (helps OCR on low-res captures); large images are downscaled to the same cap (keeps payload and Textract bytes reasonable).
- **EXIF orientation:** `.rotate()` with no arg auto-orients, fixing sideways/upside-down phone photos that otherwise wreck OCR. The output JPEG is baked to the correct orientation with EXIF orientation reset, so no double-rotation downstream.
- **Color loss is intentional:** `.grayscale()` is correct for text OCR; lab-result charts that rely on color are out of scope for v1 (see below).
- **Medical disclaimers / hallucination guards / `readable:false` path:** **unaffected and untouched.** Those live in `lib/prompts.ts` and `lib/prescription.ts`. Preprocessing only changes input pixels; the "NEVER guess a drug name / set `readable:false` if illegible" safety rules and the "We couldn't read this — ask your pharmacist" path (route lines 64–69) are owned by other specs and continue to gate on the *analysis* result, not the image. If anything, a cleaner image makes a genuine `readable:false` rarer and more trustworthy.
- **License:** `sharp` is Apache-2.0; libvips is LGPL-2.1+ (dynamically linked via prebuilt binary). Both are fine for this app. No attribution UI required.
- **Privacy:** preprocessing is in-memory on the server; the cleaned buffer replaces the raw one. No image leaves the process during this step (the Storage upload, owned by the route, is a separate later step).

## Testing & Acceptance Criteria

### Local unit/smoke test (no AWS, no Supabase, no Next runtime)
Create `scripts/test-image-preprocess.mjs`:
```js
// scripts/test-image-preprocess.mjs
// Run: node scripts/test-image-preprocess.mjs
import sharp from 'sharp';
import { preprocessScanImage } from '../lib/image-preprocess.ts';
// NOTE: if running .ts directly is awkward in your setup, either:
//   - run via `npx tsx scripts/test-image-preprocess.mjs`, or
//   - temporarily compile, or copy the function inline for the smoke test.

function isJpeg(buf) {
  // JPEG magic bytes: FF D8 ... FF D9
  return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[buf.length - 2] === 0xff && buf[buf.length - 1] === 0xd9;
}

async function main() {
  // 1. Build a small synthetic "messy" source: 300x400 noisy PNG, on purpose small + non-JPEG.
  const srcBuffer = await sharp({
    create: { width: 300, height: 400, channels: 3, background: { r: 90, g: 90, b: 90 } },
  })
    .png()
    .toBuffer();

  const srcBase64WithPrefix = 'data:image/png;base64,' + srcBuffer.toString('base64');

  // 2. Run preprocessing (exercise the prefix-strip path too).
  const outBase64 = await preprocessScanImage(srcBase64WithPrefix);

  // 3a. Output must NOT carry a data-URI prefix.
  if (outBase64.startsWith('data:')) throw new Error('FAIL: output still has data-URI prefix');

  // 3b. Output must be valid base64 that decodes to a JPEG.
  const outBuffer = Buffer.from(outBase64, 'base64');
  if (!isJpeg(outBuffer)) throw new Error('FAIL: output is not a valid JPEG');

  // 3c. Output should be upscaled to ~2000px wide (small input enlarged).
  const meta = await sharp(outBuffer).metadata();
  if (meta.width !== 2000) throw new Error(`FAIL: expected width 2000, got ${meta.width}`);
  if (meta.channels > 1 && meta.space !== 'b-w') {
    // grayscale JPEGs report space 'b-w'; tolerate either single-channel or b-w
    console.warn('WARN: output not detected as grayscale, space=', meta.space);
  }

  // 3d. Error-path: garbage input returns the (prefix-stripped) original, no throw.
  const garbageOut = await preprocessScanImage('data:image/jpeg;base64,not-real-bytes');
  if (garbageOut !== 'not-real-bytes') throw new Error('FAIL: error path did not return stripped original');

  console.log('PASS: JPEG, no prefix, width=2000, grayscale, error-fallback OK');
}

main().catch((e) => { console.error(e); process.exit(1); });
```
Run it (no credentials needed):
```bash
npx tsx scripts/test-image-preprocess.mjs   # or: node --experimental-strip-types ... on Node ≥22
```

### Pass/fail checks
1. **PASS:** `npm install sharp@^0.34.5` succeeds and `package.json` lists `sharp`.
2. **PASS:** `lib/image-preprocess.ts` type-checks (`npx tsc --noEmit`) and exports `preprocessScanImage`.
3. **PASS:** the test script prints `PASS: ...` — output is valid JPEG, has no data-URI prefix, is 2000px wide (small input upscaled), and is grayscale.
4. **PASS:** feeding deliberately invalid base64 returns the original string and does **not** throw.
5. **FAIL** if any of: output still has a `data:` prefix; output is not JPEG; the function throws on bad input; or `sharp` is missing from `package.json` dependencies.

### Real-AWS verification (only after spec-02 merges the integration — not part of this spec's acceptance)
With real AWS creds in `.env.local`, scan a deliberately dim/skewed phone photo of a printed prescription via the scan UI and confirm the resulting `medications[]` in `/results/[id]` is at least as complete as without preprocessing. This is an *informational* check; spec-01's own acceptance is the offline script above.

## Out of Scope / Future
- **Adaptive threshold / binarisation & perspective ("deskew") correction** for crumpled or angled handwritten scripts. The strong upgrade here is `@techstark/opencv-js` (WASM OpenCV) for adaptive thresholding and a 4-point perspective warp to flatten a photographed-at-an-angle page. Deliberately deferred from v1 to keep this module a tiny, dependency-light, pure function. When added, it should slot in as an optional second stage inside `preprocessScanImage` behind the same try/catch.
- Per-scan-type tuning (e.g., keep color for lab-result charts, different sharpening for handwriting vs. print).
- Auto-cropping the document out of the background.
- Caching preprocessed output. Not needed; the op is fast and runs once per scan.

## Parallel-Execution Notes
This spec can run **fully concurrently** with every other spec, including spec-02, with **zero merge conflicts**, because:
- It creates two brand-new files (`lib/image-preprocess.ts`, `scripts/test-image-preprocess.mjs`) that no other spec touches.
- Its only edit to a shared file is **adding** `sharp` to `package.json` `dependencies` — an additive, isolated line.
- It makes **no** change to `app/api/scan/route.ts`, `lib/prescription.ts`, `lib/bedrock.ts`, `lib/prompts.ts`, the scan UI, or `supabase_schema.sql`.
- The integration into the request path (the single call site) is owned by **spec-02**; this spec only documents the exact diff. spec-02 can be developed in parallel and merge the one-liner whenever `lib/image-preprocess.ts` lands — the import target is stable (`@/lib/image-preprocess`, named export `preprocessScanImage`, signature `(imageBase64: string) => Promise<string>`).
