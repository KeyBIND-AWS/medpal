// lib/tts-normalize.ts
// Expand dosage/frequency shorthand into spoken words before synthesis.
// MMS-TTS has no built-in number/abbreviation normalizer, so "500mg" would be
// read letter-by-letter. We keep units in English words — that's idiomatic in
// Philippine medical speech, so it's natural across all three languages.
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
