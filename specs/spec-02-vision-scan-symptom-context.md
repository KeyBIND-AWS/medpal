# Spec 02 — Smart Scan: Bedrock Vision + Symptom/Condition Context + Anti-Hallucination

## Goal

Replace the brittle Textract-Queries + regex scan pipeline with **AWS Bedrock Claude Vision** as the primary brain (keeping Textract + Comprehend Medical as a fallback and a drug-validation safety net), add an **optional symptom/condition context** input (typed + spoken) on the scan screen, and add an **anti-hallucination cross-check** that warns when extracted medications don't plausibly match the patient's stated condition.

**Why:** The current `analyzePrescriptionImage()` (Textract Queries + Comprehend Medical + regex) loses structure on real Filipino prescriptions (handwriting, abbreviated sig notation, multi-drug rows) and produces shallow, often-empty parses. A single Claude Vision call returns the full structured `ParsingResult` in one shot, reads handwriting far better, and — when told what's wrong with the patient ("sip-on"/cold, "high blood") — can flag the dangerous case where the script reads as something that does NOT match the complaint (e.g. user says "cold" but the script is a blood-pressure drug). This directly serves low-literacy Filipino patients who can describe symptoms in Bisaya/Tagalog but cannot read a doctor's handwriting.

---

## Scope & File Ownership

### This spec CREATES
- `lib/comprehend-validate.ts` — small helper: `validateDrugNames(drugNames, language)` → per-drug `{ exists, resolvedGeneric, score }` using Comprehend Medical (`DetectEntitiesV2`, optionally `InferRxNorm`). Pure AWS-or-mock, no UI.

### This spec MODIFIES
- `app/api/scan/route.ts` — accept optional `symptoms`; call `preprocessScanImage()` (spec-01) with graceful fallback; route to new `analyzePrescriptionVision()`; persist new fields.
- `lib/prescription.ts` — add `analyzePrescriptionVision(imageBase64, language, symptoms?)`; extend `ParsingResult` (add `mismatch_warning`, `symptoms`, per-med `confidence`); keep `analyzePrescriptionImage()` as the typed fallback; wire Comprehend validation.
- `lib/bedrock.ts` — make the model id overridable per call (`invokeModel(..., modelIdOverride?)`, `analyzeImage(..., modelIdOverride?)`); fix the EOL default model id.
- `lib/prompts.ts` — extend `getPrescriptionSystemPrompt` + `getScanUserPrompt` to accept symptom context and emit `mismatch_warning` + per-med `confidence`.
- `app/scan/page.tsx` — symptom text input + Web Speech mic button; send `symptoms` in the POST body.
- `app/results/[id]/page.tsx` — render a prominent `mismatch_warning` banner.
- `components/ui/MedicationCard.tsx` — optional low-confidence "verify with pharmacist" chip.
- `types/schema.ts` — add `mismatch_warning`/`symptoms` to `ScanResult`, `confidence` to `MedicationRecord`.
- `lib/dictionaries.ts` — add `scanner.symptomLabel`, `scanner.symptomPlaceholder`, `scanner.speak`, `scanner.listening`, `results.mismatchWarning`, `results.verifyPharmacist` for all three languages.
- `supabase_schema.sql` — add `scans.symptoms`, `scans.mismatch_warning`, `medications.confidence`.

### Do NOT touch (owned by other specs)
- `lib/image-preprocess.ts` (**spec-01 owns it** — this spec only *consumes* it; do not create it here).
- Any text-to-speech / audio-readout files (e.g. `lib/tts.ts`, `lib/polly.ts`, a `SpeakButton` component) — **spec-03 owns voice output.** This spec uses speech *input* (browser `SpeechRecognition`) only; it must NOT add audio *output*.
- `lib/bedrock.ts` `chat()` and `analyzeInteractions()` — leave their signatures unchanged (only the shared `invokeModel` gets a new optional trailing arg, which is backward compatible).

### Seams (how this composes)
- **spec-01 (preprocess):** consumes `preprocessScanImage(base64): Promise<string>`. If the module/function is absent, fall back to the raw image (try/catch + dynamic import — see Step 1). No hard dependency.
- **spec-03 (TTS):** independent. spec-03 reads `summary` / `mismatch_warning` text this spec writes; we just produce strings, spec-03 speaks them.
- Interaction-warning spec(s): untouched. `analyzeInteractions()` and the `interaction_warnings` array keep their current shape.

---

## Prerequisites

- **npm packages:** none new. `@aws-sdk/client-bedrock-runtime`, `@aws-sdk/client-textract`, `@aws-sdk/client-comprehendmedical` are already imported in `lib/bedrock.ts` / `lib/prescription.ts`.
- **Env vars (existing):** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION=us-east-1`, `BEDROCK_MODEL_ID`. Default model is **Claude Haiku 4.5** (`us.anthropic.claude-haiku-4-5-20251001-v1:0`) — vision-capable. New optional env: `BEDROCK_VISION_FALLBACK_MODEL_ID` (default `us.anthropic.claude-sonnet-4-5-20250929-v1:0`) used to escalate handwritten/low-confidence scans.
  - **Critical:** these models REQUIRE the `us.` cross-region inference profile prefix in us-east-1; the bare id is rejected. Do not reference EOL Claude 3/3.5 models.
- **AWS notes:** Bedrock `InvokeModel` (Anthropic messages body, image content block), Comprehend Medical `DetectEntitiesV2` (+ optional `InferRxNorm`). All three already proven working with real creds. **Preserve the dev-fallback-to-mock behavior** in every new code path (no creds ⇒ deterministic mock, never throw).
- **Depends on spec-01** only softly (graceful degradation). Can merge before or after spec-01.

---

## Implementation Steps

### Step 1 — `app/api/scan/route.ts`: accept symptoms, preprocess, route to vision, persist

Change the destructure and the analysis call. Current lines 18 and 47-61 are the anchor.

```ts
// was: const { image, type, language } = await req.json();
const { image, type, language, symptoms } = await req.json();
// symptoms?: string  — optional free text, may be '' or undefined
```

Before analysis, **optionally preprocess** (spec-01) with graceful fallback:

```ts
// --- spec-01 image preprocessing (graceful degrade) ---
let processedImage = image;
try {
  const mod = await import('@/lib/image-preprocess').catch(() => null);
  if (mod?.preprocessScanImage) {
    processedImage = await mod.preprocessScanImage(image);
  }
} catch (e) {
  console.warn('preprocessScanImage unavailable, using raw image:', e);
  processedImage = image;
}
```

Note: the **raw** `image` is still what gets uploaded to Storage (so the user sees the original photo); only the analysis input is the preprocessed one. Keep the existing upload block (lines 27-45) using `image`.

Swap the analysis call (lines 48-61) to the new vision function, keeping the 30s race + timeout response:

```ts
let aiPayload: ParsingResult;
try {
  aiPayload = await Promise.race([
    analyzePrescriptionVision(processedImage, language, symptoms),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Vision processing gateway timeout.')), 30000)
    ),
  ]);
} catch (timeoutErr: any) {
  return NextResponse.json(
    { error: timeoutErr.message || 'AI engine timeout.', code: 'VISION_TIMEOUT' },
    { status: 504 }
  );
}
```

Update the import on line 3:
```ts
import { analyzePrescriptionVision, ParsingResult } from '@/lib/prescription';
```

Keep the `!aiPayload.readable` → `UNREADABLE` 400 branch (lines 64-69) **exactly as-is** (the "ask your pharmacist" path).

Persist the new fields. In the `scans` insert (lines 73-83) add:
```ts
.insert({
  user_id: user.id,
  type,
  image_url: storageData.path,
  ai_response: aiPayload,            // now also contains mismatch_warning + per-med confidence
  summary: aiPayload.summary,
  language,
  symptoms: symptoms || null,        // NEW
  mismatch_warning: aiPayload.mismatch_warning || null,  // NEW
})
```

In the medications map (lines 89-102) add `confidence`:
```ts
confidence: typeof med.confidence === 'number' ? med.confidence : null,  // NEW
```

Return `mismatch_warning` to the client (lines 111-115):
```ts
return NextResponse.json({
  scan_id: scanRow.id,
  summary: scanRow.summary,
  medications: aiPayload.medications,
  mismatch_warning: aiPayload.mismatch_warning ?? null,  // NEW
});
```

### Step 2 — `lib/bedrock.ts`: per-call model override + fix EOL default

Replace the module-level constant usage so a caller can escalate Haiku → Sonnet.

```ts
// line 7-8: fix the EOL default
const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

export const VISION_FALLBACK_MODEL_ID =
  process.env.BEDROCK_VISION_FALLBACK_MODEL_ID ||
  'us.anthropic.claude-sonnet-4-5-20250929-v1:0';
```

Thread an override through `invokeModel` (currently lines 23-56) and `analyzeImage` (lines 124-157):

```ts
async function invokeModel(
  system: string,
  messages: { role: string; content: unknown }[],
  maxTokens = 4096,
  modelIdOverride?: string,            // NEW
): Promise<string> {
  ...
  const command = new InvokeModelCommand({
    modelId: modelIdOverride || MODEL_ID,   // CHANGED
    ...
  });
  ...
}

export async function analyzeImage(
  imageBase64: string,
  type: 'prescription' | 'lab_result',
  language: string,
  symptoms?: string,                   // NEW — forwarded into the prompts
  modelIdOverride?: string,            // NEW
): Promise<string> {
  const client = createClient();
  if (!client) {
    console.warn('AWS Bedrock credentials missing. Returning mock analysis.');
    return JSON.stringify(getMockScanResponse(type, language, symptoms)); // mock honors symptoms
  }
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const system = getSystemPrompt(type, language, symptoms);   // CHANGED (see Step 4)
  const userPrompt = getScanUserPrompt(type, language, symptoms); // CHANGED
  try {
    return await invokeModel(
      system,
      [{ role: 'user', content: [
        { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64Data } },
        { type: 'text', text: userPrompt },
      ]}],
      4096,
      modelIdOverride,                 // NEW
    );
  } catch (err) {
    console.error('AWS Bedrock analyzeImage failed, falling back to mock:', err);
    return JSON.stringify(getMockScanResponse(type, language, symptoms));
  }
}
```

`getMockScanResponse` keeps returning `readable:true` mock prescription data; when `symptoms` is the canonical mismatch trigger (contains "cold"/"sip-on"/"sipon"/"ubo" while mock meds are BP-style — see Step 5 mock rule) it should set a mock `mismatch_warning`. Leave `chat()` / `analyzeInteractions()` signatures untouched (they call `invokeModel` with no override → still `MODEL_ID`).

### Step 3 — `lib/prescription.ts`: `analyzePrescriptionVision()` + Comprehend safety net

Add the new primary path. It calls Bedrock vision, parses/validates JSON, runs the Comprehend drug-existence check, and falls back to `analyzePrescriptionImage()` on any failure or low confidence.

```ts
import { analyzeImage, VISION_FALLBACK_MODEL_ID } from './bedrock';
import { validateDrugNames } from './comprehend-validate';

const VISION_CONFIDENCE_FLOOR = 0.55; // below this → escalate to Sonnet, then to Textract

function stripJsonFences(raw: string): string {
  return raw.trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function safeParseParsingResult(raw: string): ParsingResult | null {
  try {
    const obj = JSON.parse(stripJsonFences(raw));
    if (typeof obj !== 'object' || obj === null) return null;
    if (typeof obj.readable !== 'boolean' || !Array.isArray(obj.medications)) return null;
    return obj as ParsingResult;
  } catch {
    return null;
  }
}

export async function analyzePrescriptionVision(
  imageBase64: string,
  language: string,
  symptoms?: string,
): Promise<ParsingResult> {
  // 1. Primary: Claude Vision (Haiku). analyzeImage falls back to mock when no creds.
  let raw = await analyzeImage(imageBase64, 'prescription', language, symptoms);
  let parsed = safeParseParsingResult(raw);

  // 2. Escalate Haiku → Sonnet when JSON is broken OR confidence is low / handwriting suspected
  const lowConfidence = (p: ParsingResult | null) =>
    !p || !p.readable || p.medications.length === 0 ||
    p.medications.some(m => typeof m.confidence === 'number' && m.confidence < VISION_CONFIDENCE_FLOOR);

  if ((!parsed || lowConfidence(parsed)) && hasAwsCredentials()) {
    const rawHi = await analyzeImage(imageBase64, 'prescription', language, symptoms, VISION_FALLBACK_MODEL_ID);
    const parsedHi = safeParseParsingResult(rawHi);
    if (parsedHi && !lowConfidence(parsedHi)) parsed = parsedHi;
    else if (parsedHi && !parsed) parsed = parsedHi;
  }

  // 3. Hard fallback: vision unusable → original Textract+Comprehend chain
  if (!parsed) {
    console.warn('Vision JSON unusable; falling back to Textract/Comprehend.');
    return analyzePrescriptionImage(imageBase64, language);
  }

  // 4. Comprehend Medical drug-existence safety net (triple-check generic + flag phantoms)
  if (parsed.readable && parsed.medications.length > 0 && hasAwsCredentials()) {
    try {
      const checks = await validateDrugNames(parsed.medications.map(m => m.drug_name), language);
      parsed.medications = parsed.medications.map((m, i) => {
        const c = checks[i];
        if (!c) return m;
        // fill generic if Comprehend resolved one and Claude left it null
        if (!m.generic_name && c.resolvedGeneric) m.generic_name = c.resolvedGeneric;
        // confidently-extracted but UNRESOLVED drug → append a verify-with-pharmacist warning
        if (!c.exists && (m.confidence ?? 1) >= VISION_CONFIDENCE_FLOOR) {
          const note = pharmacistVerifyNote(language); // localized string
          m.warnings = m.warnings ? `${m.warnings} ${note}` : note;
          m.confidence = Math.min(m.confidence ?? 0.5, 0.4); // demote
        }
        return m;
      });
    } catch (e) {
      console.warn('Comprehend drug validation skipped:', e);
    }
  }

  // 5. Carry the symptom text through for persistence/debug
  parsed.symptoms = symptoms || null;
  return parsed;
}
```

`hasAwsCredentials()`, `getMockPrescription()`, and `analyzePrescriptionImage()` already exist in this file — reuse them. `getMockPrescription` must gain a `mismatch_warning` field (default `null`) and per-med `confidence` (default e.g. `0.95`) so the mock satisfies the extended `ParsingResult`. Add a `pharmacistVerifyNote(language)` localized helper (Bisaya/Filipino/English string: "Please double-check this medicine with your pharmacist.").

### Step 4 — `lib/prompts.ts`: symptom context + new output fields

`getPrescriptionSystemPrompt(language)` → `getPrescriptionSystemPrompt(language, symptoms?)`. Inject an optional context block after `${lang.instruction}` and add two rules + two schema fields. `getSystemPrompt` and `getScanUserPrompt` gain an optional trailing `symptoms?` arg and forward it (only the `'prescription'` branch uses it; `'lab_result'` ignores it).

Context block (only when `symptoms?.trim()`):
```ts
const symptomBlock = symptoms?.trim()
  ? `\n## Patient's Stated Symptoms / Condition\nThe patient described what is wrong with them (in their own words, possibly Bisaya/Tagalog): "${symptoms.trim()}".\nUse this ONLY as a cross-check. Do NOT let it change how you read the handwriting, and NEVER invent a medication to match the symptom.`
  : '';
```

Add to the `## Rules` list:
```
7. CONFIDENCE: for each medication, include a "confidence" number from 0.0 to 1.0 reflecting how clearly you could read the drug name and dosage. Use < 0.6 for unclear handwriting.
8. SYMPTOM CROSS-CHECK: if the patient stated symptoms/condition above, judge whether the extracted medications plausibly match. If they clearly do NOT match (e.g. patient says "cold/sipon" but the script is a blood-pressure or diabetes drug), set "mismatch_warning" to a short ${lang.name} sentence telling them to double-check with their pharmacist. If they plausibly match, or no symptoms were given, set "mismatch_warning" to null. NEVER diagnose; this is only a prompt to verify.
```

Extend the JSON schema (after line 67, per-med) and add a top-level field (after the medications array):
```
  // inside each medication object:
  "confidence": number,            // 0.0–1.0, reading confidence
  ...
  // top-level, sibling of "medications":
  "mismatch_warning": "string | null — set only when meds clearly don't match the stated condition, in ${lang.name}",
```

Keep rules 1-6 (incl. the existing **"NEVER GUESS A DRUG NAME … set readable:false"** rule) and the "Respond with ONLY the JSON object" instruction unchanged.

### Step 5 — `lib/comprehend-validate.ts` (NEW)

```ts
import { ComprehendMedicalClient, InferRxNormCommand, DetectEntitiesV2Command }
  from '@aws-sdk/client-comprehendmedical';

export interface DrugCheck { exists: boolean; resolvedGeneric: string | null; score: number; }

function hasAwsCredentials() {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export async function validateDrugNames(
  drugNames: string[],
  _language: string,
): Promise<DrugCheck[]> {
  if (!hasAwsCredentials()) {
    // Mock: assume every named drug exists (preserve dev fallback, never block the UI)
    return drugNames.map(() => ({ exists: true, resolvedGeneric: null, score: 1 }));
  }
  const client = new ComprehendMedicalClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return Promise.all(drugNames.map(async (name) => {
    try {
      // InferRxNorm resolves real drugs to RxNorm concepts; empty = likely not a real drug
      const res = await client.send(new InferRxNormCommand({ Text: name }));
      const ent = (res.Entities || [])[0];
      const concept = ent?.RxNormConcepts?.[0];
      return {
        exists: !!concept,
        resolvedGeneric: concept?.Description ?? null,
        score: ent?.Score ?? 0,
      };
    } catch {
      // On API error, do NOT punish the drug (fail-open): treat as exists
      return { exists: true, resolvedGeneric: null, score: 0 };
    }
  }));
}
```
Fail-open on errors so a Comprehend outage never blocks a legitimate scan; only a *confident* "no RxNorm concept" demotes a drug.

### Step 6 — `app/scan/page.tsx`: symptom input + mic, send in body

Add state and a BCP-47 map, render a labeled textarea + mic above the Analyze button, and include `symptoms` in the POST body.

```ts
const [symptoms, setSymptoms] = useState('');
const [listening, setListening] = useState(false);

const SPEECH_LOCALE: Record<string, string> = {
  filipino: 'fil-PH',
  english: 'en-US',
  bisaya: 'fil-PH', // no Cebuano STT locale exists → fall back to Filipino (or text-only)
};

const startDictation = () => {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) return; // feature-detect: no SR → mic button hidden / text-only
  const rec = new SR();
  rec.lang = SPEECH_LOCALE[language] || 'en-US';
  rec.interimResults = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: any) => setSymptoms(prev => (prev ? prev + ' ' : '') + e.results[0][0].transcript);
  rec.onend = () => setListening(false);
  rec.onerror = () => setListening(false);
  setListening(true);
  rec.start();
};
```

POST body (replace lines 30-34):
```ts
body: JSON.stringify({
  image: capturedImage,
  type: scanType,
  language,
  symptoms: symptoms.trim() || undefined,  // NEW
}),
```

UI: render the symptom field in **Preview Mode** (after the captured `<img>`, before/around the retake control, inside the `capturedImage && !isAnalyzing` region). Feature-detect the mic via a `useState`+`useEffect` `speechSupported` flag (so SSR-safe); when unsupported, render text-only. Use the existing `t.scanner.*` keys (Step 8). Keep the `SparkleIcon`/`Button` styling consistent; add a `MicrophoneIcon` from `@phosphor-icons/react`, pulsing while `listening`.

### Step 7 — Results UI: mismatch banner + low-confidence chip

`app/results/[id]/page.tsx`: the GET `/api/records/[id]` response includes `ai_response` (the full `ParsingResult`, which now has `mismatch_warning`). Render a banner above the medication stack:

```tsx
{resultData.ai_response?.mismatch_warning && (
  <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-400/30 text-rose-800 p-4 rounded-2xl text-sm font-semibold">
    <WarningIcon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" weight="fill" />
    <div className="flex flex-col gap-0.5">
      <span className="font-bold uppercase tracking-wider text-[10px] text-rose-700">
        {t.results.mismatchWarning}
      </span>
      <span>{resultData.ai_response.mismatch_warning}</span>
    </div>
  </div>
)}
```
(`ScanResult` in `types/schema.ts` must expose `ai_response?: { mismatch_warning?: string | null }` — or add `mismatch_warning` directly. Prefer reading `ai_response.mismatch_warning` since that's what the records route returns; also accept the top-level field the scan POST returns for the immediate redirect case.)

`components/ui/MedicationCard.tsx`: when `medication.confidence != null && medication.confidence < 0.6`, render a small amber "Verify with pharmacist" chip near the drug name (reuse the existing amber warning styling, lines 89-97 pattern). Add `confidence?: number` to `MedicationRecord`.

### Step 8 — i18n keys (`lib/dictionaries.ts`)

Add to each language's `scanner` and `results` blocks:
```
scanner.symptomLabel       — "What's wrong? (optional)" / "Unsa imong gibati? (opsyonal)" / "Ano ang nararamdaman? (opsyonal)"
scanner.symptomPlaceholder — e.g. "e.g. cold, fever, high blood" localized
scanner.speak              — "Speak" / "Isulti" / "Magsalita"
scanner.listening          — "Listening…" / "Naminaw…" / "Nakikinig…"
results.mismatchWarning    — "Please double-check" / "Palihug susiha pag-usab" / "Pakisuri muli"
results.verifyPharmacist   — "Verify with pharmacist" (MedicationCard chip)
```

---

## Data Model & API Changes

### DB columns

`supabase_schema.sql` — add to the `scans` `create table` body and an idempotent ALTER block; add `confidence` to `medications`:

```sql
-- scans: symptom context + symptom/med mismatch flag
alter table public.scans add column if not exists symptoms         text;
alter table public.scans add column if not exists mismatch_warning text;

-- medications: per-drug reading confidence (0.0–1.0)
alter table public.medications add column if not exists confidence numeric;
```
Also add `symptoms text` and `mismatch_warning text` into the `create table if not exists public.scans (...)` definition, and `confidence numeric` into `create table if not exists public.medications (...)`, so a fresh DB matches. RLS already covers these rows (`scans_all_own`, `medications_all_own`) — no policy change.

### `ParsingResult` (lib/prescription.ts) — extended

```ts
export interface ParsingResult {
  readable: boolean;
  patient_name?: string;
  summary: string;
  symptoms?: string | null;          // NEW — echoed stated condition
  mismatch_warning?: string | null;  // NEW — null unless meds clash with symptoms
  medications: Array<{
    drug_name: string;
    generic_name: string | null;
    dosage: string;
    frequency: string;
    timing: string[] | null;
    duration: string | null;
    purpose: string;
    instructions: string;
    warnings: string | null;
    confidence?: number;             // NEW — 0.0–1.0
  }>;
  disclaimer: string;
}
```

### `types/schema.ts`
- `MedicationRecord`: add `confidence?: number;`
- `ScanResult`: add `mismatch_warning?: string | null;` and (for the records-route shape) `ai_response?: { mismatch_warning?: string | null } & Record<string, unknown>;`

### Request / Response JSON

**POST `/api/scan` request** (added field):
```jsonc
{ "image": "<base64>", "type": "prescription", "language": "bisaya", "symptoms": "sipon ug hilanat" }
```
**POST `/api/scan` response** (added field):
```jsonc
{ "scan_id": "uuid", "summary": "…", "medications": [ { "...": "...", "confidence": 0.92 } ], "mismatch_warning": null }
```
**GET `/api/records/[id]`** is unchanged structurally; `ai_response` now carries `mismatch_warning` + per-med `confidence` (already inside the persisted `ai_response` jsonb), and `medications[].confidence` is selectable (add `confidence` to the select list in `app/api/records/[id]/route.ts` — this is a 1-line add inside this spec's ownership of the scan pipeline; coordinate as a trivial, conflict-free addition).

---

## UI / UX

- **Scan screen (`app/scan/page.tsx`):** in Preview Mode, a labeled multiline **symptom textarea** (`scanner.symptomLabel` / `scanner.symptomPlaceholder`), optional and skippable. A **mic button** (`MicrophoneIcon`) appears only when `SpeechRecognition`/`webkitSpeechRecognition` is present; pressing it dictates into the textarea, pulsing and showing `scanner.listening`. Language → BCP-47: `filipino→fil-PH`, `english→en-US`, `bisaya→fil-PH` (no Cebuano STT locale; degrade to Filipino dictation or text-only). The Analyze button still works with an empty symptom field.
- **Loading copy:** the existing scan loading card hardcodes "AWS Bedrock Claude 3.5" (line 90) — update to "AWS Bedrock Claude" (drop the EOL "3.5") since the model is now Haiku 4.5/Sonnet 4.5.
- **Results (`app/results/[id]/page.tsx`):** a prominent **rose/red mismatch banner** (distinct from the per-med amber `warnings` box) rendered above the medication stack only when `ai_response.mismatch_warning` is set. The existing `DisclaimerBanner` stays.
- **MedicationCard:** low-confidence drugs (`confidence < 0.6`) get a small amber **"Verify with pharmacist"** chip; otherwise the card is unchanged.
- **Language handling:** all new strings come from `lib/dictionaries.ts` via `useTranslation()`; Claude emits `mismatch_warning`/`purpose`/`warnings` already in the user's language (driven by `lang.instruction` in the system prompt). No English leakage in patient-facing text.

---

## Safety & Edge Cases

- **Keep the disclaimer.** `ParsingResult.disclaimer` and `<DisclaimerBanner>` remain. Never present LLM output as medical advice.
- **`readable:false` path preserved.** Vision returning `readable:false` (or empty meds after all fallbacks) still hits the route's `UNREADABLE` 400 → UI shows "We couldn't read this — ask your pharmacist." NEVER guess a drug name (prompt rule 2, untouched).
- **Mismatch is a verify-prompt, NOT a diagnosis.** `mismatch_warning` only says "double-check with your pharmacist." It never names a condition the patient might have, never tells them to stop/start a drug.
- **Hallucination guards (defense in depth):**
  1. Prompt forbids inventing drug names + requires `confidence`.
  2. Haiku→Sonnet escalation on low confidence / handwriting.
  3. Comprehend Medical `InferRxNorm` confirms each confidently-read drug actually exists; an unresolved-but-confident drug gets a pharmacist-verify warning and demoted confidence — we surface doubt rather than trusting the model.
  4. Textract+Comprehend hard fallback when vision JSON is unusable.
- **Fail-open on AWS errors.** Comprehend validation and preprocessing are best-effort: their failures never block a legitimate scan (Comprehend treats errors as "exists"; preprocess falls back to raw image).
- **Language fallbacks.** No Cebuano STT → `bisaya` dictation uses `fil-PH`; if even that's unsupported, text-only. Unknown `language` → `getLang()` already defaults to `bisaya`.
- **Speech privacy.** `SpeechRecognition` may route audio to a browser/cloud STT service; symptoms are stored in `scans.symptoms` (RLS-protected, own-rows-only). Symptom capture is explicitly optional.
- **PHI / license notes.** Comprehend Medical processes drug-name text (not the full image) and is HIPAA-eligible. Symptoms text is low-sensitivity but still user-scoped via RLS. No new third-party data sharing beyond AWS + the browser STT the user already grants mic permission for.
- **Mock mode.** No AWS creds ⇒ `analyzeImage`/`validateDrugNames`/`analyzePrescriptionImage` all return deterministic mocks; `mismatch_warning` defaults to `null` (or the canonical mock-mismatch when `symptoms` contains a cold/cough term against the BP-style mock — see Step 2/5) so the feature is demoable offline.

---

## Testing & Acceptance Criteria

**Local, with real AWS creds in `.env.local`:**
1. **Clear printed prescription, no symptoms** → POST `/api/scan` returns `readable:true`, ≥1 medication with `confidence ≥ 0.6`, `mismatch_warning: null`. Results page shows cards, no rose banner. *(PASS: structured meds, no warning.)*
2. **Illegible / blank image** → after Haiku→Sonnet→Textract fallbacks, `readable:false` → route returns 400 `UNREADABLE` → UI shows "ask your pharmacist." *(PASS: no invented drugs.)*
3. **Symptom/med mismatch** → type `symptoms:"cold"` (or "sipon"), scan a clearly **blood-pressure** medication (e.g. Amlodipine/Losartan) → `mismatch_warning` is a non-null localized "double-check with your pharmacist" string; rose banner renders on results. *(PASS: mismatch fires.)*
4. **Symptom match** → `symptoms:"cold"` + a paracetamol/decongestant script → `mismatch_warning: null`. *(PASS: no false alarm.)*
5. **Phantom drug** → if Claude returns a confident drug name with no RxNorm concept, that med carries the pharmacist-verify warning and `confidence ≤ 0.4`. *(Inspect persisted `ai_response`.)*
6. **Spoken symptoms** → on a `SpeechRecognition`-capable browser (Chrome), tapping the mic with language=Filipino dictates into the textarea (`fil-PH`); Bisaya falls back to `fil-PH`; unsupported browser hides the mic and text-only still works.
7. **Model escalation** → log/inspect that a low-confidence first pass triggers a second `analyzeImage` call with `VISION_FALLBACK_MODEL_ID` (Sonnet).

**Mock mode (no AWS creds):** every path returns mock data without throwing; `/api/scan` succeeds; results render; mic still works (browser-side). `mismatch_warning` is `null` (or the demo mock-mismatch).

**Type/build:** `npx tsc --noEmit` clean; the extended `ParsingResult`, `MedicationRecord`, `ScanResult` compile; `app/api/scan/route.ts` imports `analyzePrescriptionVision`.

**Regression:** `chat()` and `analyzeInteractions()` unchanged (still use default `MODEL_ID`); existing records render (old scans lack `confidence`/`mismatch_warning` → fields are optional/nullable, no crash).

---

## Out of Scope / Future

- TTS read-aloud of `summary`/`mismatch_warning` — **spec-03.**
- Image preprocessing internals — **spec-01.**
- Lab-result vision migration (this spec migrates **prescription** scanning; `lab_result` keeps its current path, though `analyzeImage` already supports it).
- Drug–drug interaction detection (separate `analyzeInteractions` flow) — unchanged.
- Persisting which model (Haiku vs Sonnet) produced a result; multi-image / multi-page prescriptions; offline on-device STT for Cebuano.

---

## Parallel-Execution Notes

- **Runs concurrently with spec-01 (image preprocess):** this spec only *imports* `lib/image-preprocess.ts` behind a `try/dynamic-import` guard and never creates it — zero file overlap; if spec-01 isn't merged, the route uses the raw image.
- **Runs concurrently with spec-03 (TTS/voice output):** spec-03 owns audio-output files; this spec adds only speech-*input* in `app/scan/page.tsx` (which it owns) and produces the text strings spec-03 will speak. No shared files except the read-only contract that `summary`/`mismatch_warning` exist (this spec creates them).
- **Shared-file coordination:** `lib/bedrock.ts` and `lib/prompts.ts` are owned here; the only cross-cutting edit is the **optional, backward-compatible trailing arg** on `invokeModel` (other callers unaffected). `lib/dictionaries.ts` and `types/schema.ts` edits are additive (new keys/fields) — merge-safe if another spec also appends, as long as edits are key-additions not rewrites.
- `app/api/records/[id]/route.ts` gets a 1-line `confidence` select addition; flagged as trivial/conflict-free.
