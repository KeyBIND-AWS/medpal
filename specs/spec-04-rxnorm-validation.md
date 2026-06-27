# Spec 04 — Comprehend Medical RxNorm Drug Validation (anti-hallucination safety net)

## Goal

After Claude vision extracts medications from a scan, **deterministically validate each drug against AWS Comprehend Medical's RxNorm ontology** (`InferRxNorm`) to (1) confirm the drug is a real, known medication, (2) resolve/confirm its generic name + RxCUI, and (3) flag any confidently-extracted drug that does **not** resolve as "couldn't auto-verify — confirm with your pharmacist."

**Why:** spec-02 made the scan a Bedrock vision call, which is far more robust but is still an LLM — it can confidently hallucinate a plausible-but-wrong drug name. The two guards already in place are weaker than this one:
- `confidence` (per-med) is the model grading *itself* — a hallucination often comes back `high`.
- `mismatch_warning` only fires when the user typed symptoms, and only catches *semantic* mismatches (BP med vs "cold"), not invented names.

A cross-check against a real, curated drug database (RxNorm, via Comprehend Medical) is the strongest hallucination guard for a medication app, and it keeps a second AWS health-AI service meaningfully in the architecture (good for the AWS-sponsored hackathon story). This is the deferred piece of spec-02.

## Scope & File Ownership

**Creates:**
- `lib/rxnorm.ts` — the validator (Comprehend Medical `InferRxNorm`).

**Modifies:**
- `app/api/scan/route.ts` — run validation after analysis, persist results + a `verification_warning`.
- `types/schema.ts` — add `rxcui?`, `rxnorm_verified?` to `MedicationRecord`.
- `supabase_schema.sql` — add `medications.rxcui` + `medications.rxnorm_verified` (idempotent ALTER).
- `app/results/[id]/page.tsx` — a verification banner (reuses spec-02's amber-banner pattern).
- `components/ui/MedicationCard.tsx` — *optional* per-med "verified ✓ / unverified ⚠" badge.

**Do NOT touch (owned elsewhere, already implemented on branch `david/ai-scan-tts-upgrades`):**
- The vision/prompt logic: `lib/bedrock.ts`, `lib/prompts.ts`, the scan-capture UI `app/scan/page.tsx` (spec-02 — done).
- `lib/image-preprocess.ts` (spec-01).
- TTS: `app/api/tts/`, `tts-service/`, `components/ui/ListenButton.tsx`, `lib/tts-normalize.ts` (spec-03).

**Seams / overlap (call out in the PR):**
- `app/api/scan/route.ts` was rewritten by spec-02; this spec inserts ~6 lines into it (validation pass + `verification_warning`). Low conflict — it's one new block between analysis and persistence.
- `app/results/[id]/page.tsx` already carries spec-02's `mismatch_warning` banner and spec-03's `ListenButton`. Add the verification banner **directly below the mismatch banner**, same pattern — keep it in that region.
- `components/ui/MedicationCard.tsx` already carries spec-03's `ListenButton` (Directions block). If you add the optional per-med badge, put it on the **drug-name/header row**, away from the Directions block, to avoid a merge collision.

## Prerequisites

- **`@aws-sdk/client-comprehendmedical`** — already a dependency (used by `lib/prescription.ts`).
- **IAM — REQUIRED CHANGE.** The app key's policy currently grants only `comprehendmedical:DetectEntitiesV2`. **Add `comprehendmedical:InferRxNorm`** (IAM → `medpal-app` user → `medpal-ai-policy` → add the action). Without it, `InferRxNorm` returns AccessDenied and (per the fail-open rule below) validation silently no-ops — so this is easy to miss; verify it.
- **Region:** `us-east-1` (Comprehend Medical + InferRxNorm supported there; same `AWS_REGION` env already in use).
- **Bedrock FTU form** already submitted (spec-02 prerequisite) — not needed by this spec, but the scan must reach the medication-extraction step first.
- **No new platform / no new env var.** Reuses `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION`.

## Implementation Steps

### 1. `lib/rxnorm.ts` (new)

`InferRxNorm` takes `{ Text }` and returns `{ Entities: RxNormEntity[] }`, where each entity has `Category` (`MEDICATION`), `Score`, and a ranked `RxNormConcepts: [{ Code /* RxCUI */, Description, Score }]`. (Shapes verified against the installed SDK `models_0.d.ts`.)

```ts
import { ComprehendMedicalClient, InferRxNormCommand } from '@aws-sdk/client-comprehendmedical';

const SCORE_THRESHOLD = 0.5; // top concept score below this => not confidently matched

function getClient(): ComprehendMedicalClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;
  return new ComprehendMedicalClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
  });
}

export interface RxNormResult {
  verified: boolean;          // a real medication was matched with confidence >= threshold
  rxcui: string | null;       // RxNorm concept id (RxCUI) of the best match
  matched_name: string | null;// canonical RxNorm description of the best match
}

/** Validate a single drug string (prefer the generic name — see Safety §). */
export async function validateDrug(drugText: string): Promise<RxNormResult> {
  const client = getClient();
  // FAIL OPEN: no creds (dev/mock) => don't flag. A validation outage must not
  // make every real drug look suspicious.
  if (!client || !drugText?.trim()) return { verified: true, rxcui: null, matched_name: null };

  try {
    const r = await client.send(new InferRxNormCommand({ Text: drugText.trim() }));
    let best: { code?: string; desc?: string; score: number } | null = null;
    for (const e of r.Entities || []) {
      if (e.Category !== 'MEDICATION') continue;
      for (const c of e.RxNormConcepts || []) {
        const score = c.Score ?? 0;
        if (!best || score > best.score) best = { code: c.Code, desc: c.Description, score };
      }
    }
    if (best && best.score >= SCORE_THRESHOLD) {
      return { verified: true, rxcui: best.code ?? null, matched_name: best.desc ?? null };
    }
    return { verified: false, rxcui: null, matched_name: null }; // API worked, nothing matched -> flag
  } catch (err) {
    console.error('InferRxNorm failed; failing open (not flagging):', err);
    return { verified: true, rxcui: null, matched_name: null };
  }
}

type Med = { drug_name?: string; generic_name?: string | null; dosage?: string; [k: string]: any };

/** Validate every medication in parallel; attach rxnorm fields. */
export async function validateMedications<T extends Med>(meds: T[]): Promise<(T & RxNormResult & { rxnorm_verified: boolean })[]> {
  return Promise.all(meds.map(async (m) => {
    // Prefer the GENERIC name for RxNorm (US DB) — PH brands often won't resolve. See Safety §.
    const probe = (m.generic_name && m.generic_name.trim()) || m.drug_name || '';
    const res = await validateDrug(probe);
    return {
      ...m,
      rxnorm_verified: res.verified,
      rxcui: res.rxcui,
      // backfill the generic name from RxNorm only if Claude didn't already provide one
      generic_name: m.generic_name || res.matched_name || null,
      verified: res.verified,
      matched_name: res.matched_name,
    };
  }));
}
```

### 2. `app/api/scan/route.ts` — wire it in

Insert one block **after** the `if (!aiPayload.readable)` guard and **before** building `aiResponseToStore`:

```ts
import { validateMedications } from '@/lib/rxnorm';
// ...
// 5b. RxNorm validation safety net (deterministic drug-existence cross-check)
let verificationWarning: string | null = null;
if (Array.isArray(aiPayload.medications) && aiPayload.medications.length) {
  aiPayload.medications = await validateMedications(aiPayload.medications);
  const unverified = aiPayload.medications
    .filter((m: any) => m.rxnorm_verified === false)
    .map((m: any) => m.drug_name);
  if (unverified.length) {
    verificationWarning =
      `We couldn't automatically confirm ${unverified.join(', ')} against a medication database. ` +
      `Please double-check the spelling with your pharmacist.`;
    // TODO(i18n): localize via lib/dictionaries.ts like the other results strings.
  }
}
```

Then add `verification_warning` to the stored payload and the new columns to the medications insert:

```ts
const aiResponseToStore = {
  ...aiPayload,
  symptoms: symptoms && symptoms.trim() ? symptoms.trim() : null,
  verification_warning: verificationWarning,   // <-- new
};
// ...in the formattedMeds map, add:
//   rxcui: med.rxcui || null,
//   rxnorm_verified: med.rxnorm_verified ?? null,
```

**Latency:** validation is N parallel `InferRxNorm` calls (N = med count, usually 1–5), ≈ 1 short round trip. Run it *outside* the existing 30s `Promise.race` (which wraps `analyzeScan`); it adds ~1s. If you'd rather bound it, wrap `validateMedications` in its own `Promise.race` with a ~8s timeout that resolves to the un-validated meds (fail open).

### 3. Persist + surface

- **DB:** new nullable columns `medications.rxcui` (text) and `medications.rxnorm_verified` (boolean). `verification_warning` rides in `scans.ai_response` JSONB (no column — mirrors spec-02's `mismatch_warning`/`symptoms`).
- **Results page banner** (`app/results/[id]/page.tsx`), directly under the spec-02 mismatch banner:

```tsx
{(resultData as any)?.ai_response?.verification_warning && (
  <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 -mt-1">
    <WarningIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" weight="fill" />
    <p className="text-sm text-amber-800 font-medium leading-snug">
      {(resultData as any).ai_response.verification_warning}
    </p>
  </div>
)}
```

- **Optional per-med badge** (`components/ui/MedicationCard.tsx`, header row): when `medication.rxnorm_verified === false`, show a small amber "⚠ unverified" chip; when `true`, an optional subtle "✓" — keep it off the Directions block (spec-03 owns that).

## Data Model & API Changes

**`supabase_schema.sql`** — add to the `medications` create block and as idempotent ALTERs (the file already has an ALTER section):
```sql
alter table public.medications add column if not exists rxcui           text;
alter table public.medications add column if not exists rxnorm_verified boolean;
```
Run the two ALTERs against the live Supabase project (SQL Editor) after merge.

**`types/schema.ts`** — extend `MedicationRecord`:
```ts
rxcui?: string | null;
rxnorm_verified?: boolean | null;
```

**Stored shape:** `scans.ai_response.verification_warning: string | null`; `scans.ai_response.medications[].{rxcui, rxnorm_verified}`; and the joined `medications` rows carry `rxcui` / `rxnorm_verified`.

## UI / UX

- One amber banner on the results page listing any unverified drug names (localized later via `lib/dictionaries.ts`).
- Optional per-card badge. Never block the result — the meds still render; verification is advisory.
- Bisaya/Filipino/English: gate the warning text through the existing `t.results.*` dictionary keys when localizing (out of scope to fully translate here; English string is the fallback).

## Safety & Edge Cases

- **RxNorm is a US database — validate the GENERIC name, not the brand.** Filipino brands (Biogesic, Neozep, Solmux, Alaxan, Decolgen…) frequently won't resolve, but their generics (paracetamol, carbocisteine, ibuprofen…) will. `validateMedications` already probes `generic_name` first. If `generic_name` is null and only a PH brand is present, expect a non-match — so **frame the warning as "couldn't auto-confirm," never "this drug doesn't exist,"** and never tell the user to stop or change a medication.
- **Fail open on errors / missing creds / mock mode.** A Comprehend outage or the missing IAM action must not flag every drug. Only a *successful* call that returns no confident concept flags a med.
- **Compounded meds, supplements, very new drugs** may not be in RxNorm — same "couldn't auto-confirm" framing; consider not flagging if the entity Category came back as `MEDICATION` even with low concept score (tune `SCORE_THRESHOLD`).
- Keep spec-02's `readable:false → "ask your pharmacist"` path and the standing disclaimer banner.
- **PHI:** drug names are low-sensitivity, but Comprehend Medical is HIPAA-eligible; for real PHI you'd need a BAA. Hackathon/synthetic data is fine.

## Testing & Acceptance Criteria

Run with real AWS (and the new IAM action) via a small `node --env-file=.env.local --import tsx` script, or end-to-end through the scan UI:

1. **Real generic** — `validateDrug('amoxicillin 500mg')` → `verified: true`, non-null `rxcui`. ✅
2. **Hallucinated/garbled** — `validateDrug('Zorblaxin 250mg')` or `validateDrug('Amoxixyllin')` → `verified: false`. ✅ (flagged)
3. **PH brand with generic resolved by Claude** — med `{drug_name:'Biogesic', generic_name:'Paracetamol'}` → probes "Paracetamol" → `verified: true`. ✅ (no false alarm)
4. **PH brand, no generic** — `{drug_name:'Neozep', generic_name:null}` → likely `verified:false` → banner shows "couldn't auto-confirm Neozep." Acceptable + correctly worded.
5. **End-to-end** — scan the 3-med test prescription (Amoxicillin, Paracetamol, Amlodipine): all three verify; intentionally corrupt one name to confirm the banner appears and lists exactly that drug.
6. **Fail-open** — remove the IAM action (or unset creds) → no banner, scan still succeeds with meds rendered.
7. **DB** — confirm `medications.rxcui` / `rxnorm_verified` persist and the results banner reads `ai_response.verification_warning`.

## Out of Scope / Future

- `InferICD10CM` (diagnosis coding) and `InferSNOMEDCT`.
- Real-time external drug-interaction lookups (the app already does interactions via Bedrock in `getInteractionPrompt`).
- Full i18n of the verification string (wire into `lib/dictionaries.ts` in a follow-up).
- Auto-correcting a flagged drug name (we only flag; correction stays human-in-the-loop).

## Parallel-Execution Notes

- **Depends on spec-02** (the vision scan that produces `medications[]` with `drug_name`/`generic_name`) — already implemented and committed on `david/ai-scan-tts-upgrades`, so this layers cleanly on top.
- **Independent of spec-01 and spec-03.** It can run concurrently with spec-03 (TTS); the only shared files are `app/results/[id]/page.tsx` and `components/ui/MedicationCard.tsx`, where edits are confined to distinct regions (verification banner under the mismatch banner; optional badge on the header row, away from spec-03's Directions-block `ListenButton`).
- **One required ops step a teammate can't infer from code:** add `comprehendmedical:InferRxNorm` to the IAM policy, and run the two `ALTER TABLE` statements on the live DB.
</content>
