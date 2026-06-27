// Smoke test for lib/rxnorm.ts against live Comprehend Medical InferRxNorm.
// Run: npx tsx --env-file=.env.local scripts/test-rxnorm.mjs
import { validateDrug, validateMedications } from '../lib/rxnorm.ts';

const line = (label, v) => console.log(`${label.padEnd(34)} ${JSON.stringify(v)}`);

console.log('=== validateDrug ===');
line('amoxicillin 500mg (real generic)', await validateDrug('amoxicillin 500mg'));
line('Zorblaxin 250mg (hallucinated)', await validateDrug('Zorblaxin 250mg'));
line('Amoxixyllin (garbled)', await validateDrug('Amoxixyllin'));

console.log('\n=== validateMedications ===');
const meds = await validateMedications([
  { drug_name: 'Biogesic', generic_name: 'Paracetamol', dosage: '500mg' }, // PH brand w/ generic -> verified
  { drug_name: 'Neozep', generic_name: null, dosage: '1 tab' },            // PH brand no generic -> likely unverified
  { drug_name: 'Amlodipine', generic_name: 'Amlodipine', dosage: '5mg' },  // real -> verified
]);
for (const m of meds) {
  line(`${m.drug_name} (generic: ${m.generic_name ?? 'null'})`, {
    rxnorm_verified: m.rxnorm_verified,
    rxcui: m.rxcui,
  });
}
