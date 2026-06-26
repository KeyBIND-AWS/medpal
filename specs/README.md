# MedPal Upgrade Specs — Coordination Guide

Three implementation specs, designed to run **in parallel on separate chats** with minimal merge conflicts. Each spec is self-contained: an engineer (or an AI agent) can execute it cold.

| Spec | Goal | Depends on | Needs AWS? |
|---|---|---|---|
| [spec-01](spec-01-scan-image-preprocessing.md) | Add `sharp` image preprocessing before OCR/vision (sharper input → better extraction) | none | no |
| [spec-02](spec-02-vision-scan-symptom-context.md) | Switch scan to **Bedrock vision** + add **symptom/condition context** + **anti-hallucination** (mismatch warnings + Comprehend Medical drug validation) | consumes spec-01 (graceful fallback if absent) | **yes** (Bedrock + Comprehend Medical) |
| [spec-03](spec-03-multilingual-tts.md) | **Text-to-speech**: Bisaya via Meta MMS (sherpa-onnx), Tagalog/English via Web Speech | none | no |

## File ownership matrix

Each file is owned by exactly one spec. Run any subset concurrently; only the one ⚠️ overlap below needs care.

| File | Owner | Action |
|---|---|---|
| `lib/image-preprocess.ts` | **01** | create |
| `scripts/test-image-preprocess.mjs` | **01** | create |
| `package.json` (`sharp` dep) | **01** | edit |
| `app/api/scan/route.ts` | **02** | edit |
| `app/scan/page.tsx` | **02** | edit |
| `lib/prescription.ts` | **02** | edit |
| `lib/bedrock.ts` | **02** | edit |
| `lib/prompts.ts` | **02** | edit |
| `app/results/[id]/page.tsx` | **02** + **03** ⚠️ | edit (different regions) |
| `components/ui/MedicationCard.tsx` | **02** + **03** ⚠️ | edit (different regions) |
| `app/api/tts/route.ts` | **03** | create |
| `tts-service/` (sidecar) | **03** | create |
| `components/ui/ListenButton.tsx` | **03** | create |
| `lib/tts-normalize.ts` | **03** | create |
| `supabase_schema.sql` | **02** + **03** | append (different tables/policies) |

⚠️ **The only real overlap:** spec-02 adds a *mismatch-warning banner* and spec-03 adds a *Listen button* to both `app/results/[id]/page.tsx` and `components/ui/MedicationCard.tsx`. Both specs confine their edits to clearly separate regions (warning near the top / summary; Listen button in the Directions block), so a clean 3-way merge is easy. If you want zero risk, **merge spec-02 before spec-03** and have spec-03 rebase.

## Suggested execution

- **Fully parallel:** start 01, 02, and 03 in three chats now. 02 already degrades gracefully if 01 isn't merged yet (falls back to the raw image).
- **Merge order:** `01 → 02 → 03`. (01 is a dependency-free prereq for 02; 03 last to absorb the small UI overlap.)
- **DB migrations:** specs 02 and 03 each include idempotent `ALTER`/policy SQL. After merging, run their SQL blocks against the live Supabase project (SQL Editor) and keep `supabase_schema.sql` in sync.

## Shared context (already done — don't redo)

- **AWS is wired and verified** in `.env.local`: Bedrock (`BEDROCK_MODEL_ID=us.anthropic.claude-haiku-4-5-20251001-v1:0`), Textract, and Comprehend Medical all return live results. Escalation model: `us.anthropic.claude-sonnet-4-5-20250929-v1:0`. Newer Claude models **require the `us.` inference-profile prefix** on-demand in us-east-1.
- **Heads-up for spec-02:** `lib/bedrock.ts` still hardcodes an end-of-life default model id (`anthropic.claude-3-5-sonnet-20241022-v2:0`). Runtime is fine because `.env.local` overrides it via `BEDROCK_MODEL_ID`, but spec-02 should update that default to the Haiku 4.5 `us.` id so the code is correct without the env override.
- **Mock fallback:** `lib/bedrock.ts` and `lib/prescription.ts` return realistic mock data when AWS creds are absent — preserve it (keeps local dev working with no keys).
- **Languages:** `'bisaya' | 'filipino' | 'english'` (see `contexts/LanguageContext.tsx`). No Cebuano locale exists for browser speech recognition (spec-02) or browser speech synthesis (spec-03) — both fall back to `fil-PH` or the server path for Bisaya.
