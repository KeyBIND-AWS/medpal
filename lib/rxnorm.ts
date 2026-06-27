import { ComprehendMedicalClient, InferRxNormCommand } from '@aws-sdk/client-comprehendmedical';

// Top RxNorm concept score below this => the drug wasn't confidently matched.
// Comprehend Medical returns ranked concepts each with a 0–1 Score.
const SCORE_THRESHOLD = 0.5;

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
  verified: boolean;            // a real medication was matched with confidence >= threshold
  rxcui: string | null;         // RxNorm concept id (RxCUI) of the best match
  matched_name: string | null;  // canonical RxNorm description of the best match
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

/** Validate every medication in parallel; attach `rxnorm_verified` + best-match `rxcui`. */
export async function validateMedications<T extends Med>(
  meds: T[],
): Promise<(T & { rxnorm_verified: boolean; rxcui: string | null })[]> {
  return Promise.all(
    meds.map(async (m) => {
      // Prefer the GENERIC name for RxNorm (US DB) — PH brands often won't resolve. See Safety §.
      const probe = (m.generic_name && m.generic_name.trim()) || m.drug_name || '';
      const res = await validateDrug(probe);
      // We use InferRxNorm ONLY as a negative safety signal (did the name resolve at all?).
      // We intentionally do NOT backfill generic_name from res.matched_name: InferRxNorm is a
      // fuzzy matcher that maps unknown brands to similar-spelled but wrong concepts
      // (e.g. "Neozep"→neotame, "Paracetamol"→paraffin), so its matched concept is not a
      // trustworthy generic name. Keep whatever Claude extracted.
      return {
        ...m,
        rxnorm_verified: res.verified,
        rxcui: res.rxcui,
      };
    }),
  );
}
