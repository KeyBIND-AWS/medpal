/**
 * Generates a clinical prompt for AWS Bedrock to identify and analyze
 * potential drug-drug interactions in Bisaya (Cebuano).
 */
export function getInteractionPrompt(
  medications: { drug_name: string; generic_name?: string | null }[]
): string {
  const listText = medications
    .map((med) => `- ${med.drug_name}${med.generic_name ? ` (${med.generic_name})` : ''}`)
    .join('\n');

  return `You are a clinical AI pharmacist. Analyze potential drug-drug interactions between these active medications:
${listText}

Identify any warnings, level of severity (high, moderate, low), explanation in Bisaya, and clinical recommendation in Bisaya.
You MUST respond with a JSON object matching this schema exactly:
{
  "interaction_warnings": [
    {
      "severity": "high" | "moderate" | "low",
      "explanation": "Detailed explanation in Bisaya of the interaction",
      "recommendation": "Clinical advice or action plan in Bisaya"
    }
  ]
}
Return ONLY raw JSON. Do not include markdown headers, quotes, backticks, or wrapping.`;
}
