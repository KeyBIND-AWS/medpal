import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { getSystemPrompt, getScanUserPrompt, getChatSystemPrompt } from './prompts';

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-haiku-4-5-20251001-v1:0';

const TIMEOUT_MS = 30_000;

function createClient(): BedrockRuntimeClient | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  if (!accessKeyId || !secretAccessKey) return null;

  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function invokeModel(
  system: string,
  messages: { role: string; content: unknown }[],
  maxTokens = 4096,
): Promise<string> {
  const client = createClient();
  if (!client) throw new Error('AWS credentials not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const command = new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: maxTokens,
        system,
        messages,
      }),
    });

    const response = await client.send(command, {
      abortSignal: controller.signal,
    });

    const decoded = JSON.parse(new TextDecoder().decode(response.body));
    return decoded.content[0].text;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Mock data for development without AWS credentials ──────────────────

function getMockScanResponse(type: string, language: string): object {
  const isBisaya = language === 'bisaya';
  const isFilipino = language === 'filipino';

  if (type === 'lab_result') {
    return {
      readable: true,
      summary: isBisaya
        ? '[Mock] Ang imong CBC results nagpakita nga normal ang kadaghanan sa mga values.'
        : isFilipino
          ? '[Mock] Ang iyong CBC results ay nagpapakita na normal ang karamihan ng mga values.'
          : '[Mock] Your CBC results show most values are within normal range.',
      test_type: 'Complete Blood Count (CBC)',
      values: [
        {
          test_name: 'Hemoglobin',
          value: '14.2',
          unit: 'g/dL',
          normal_range: '12.0-16.0',
          status: 'normal',
          explanation: isBisaya
            ? '[Mock] Normal ang imong hemoglobin. Maayo ang level sa imong dugo.'
            : '[Mock] Your hemoglobin is normal.',
        },
      ],
      disclaimer: isBisaya
        ? '[Mock] Kini nga resulta para lang makatabang sa imong pagsabot. Konsultaha ang imong doktor.'
        : '[Mock] These results are for understanding only. Consult your doctor.',
    };
  }

  return {
    readable: true,
    summary: isBisaya
      ? '[Mock] Kini usa ka reseta alang sa pagtambal sa impeksyon. Palihug sunda ang mga instruksyon sa pag-inom.'
      : isFilipino
        ? '[Mock] Ito ay isang reseta para sa paggamot ng impeksyon. Sundin ang mga tagubilin.'
        : '[Mock] This is a prescription for infection treatment. Follow the dosage instructions.',
    medications: [
      {
        drug_name: 'Amoxicillin (Mock)',
        generic_name: 'Amoxicillin Trihydrate',
        dosage: '500mg',
        frequency: isBisaya ? 'Katulo sa usa ka adlaw' : 'Three times daily',
        timing: ['after breakfast', 'after lunch', 'after dinner'],
        duration: isBisaya ? '7 ka adlaw' : '7 days',
        purpose: isBisaya ? 'Impeksyon sa bakterya' : 'Bacterial infection',
        instructions: isBisaya
          ? '[Mock] Imna ang 1 ka kapsula matag 8 ka oras. Hurota ang tibuok nga kurso.'
          : '[Mock] Take 1 capsule every 8 hours. Finish the entire course.',
        warnings: isBisaya
          ? '[Mock] Mahimong makasakit sa tiyan. Imna human sa pagkaon.'
          : '[Mock] May cause stomach upset. Take after meals.',
      },
    ],
    interaction_warnings: [],
    disclaimer: isBisaya
      ? '[Mock] Kini nga impormasyon para lang makatabang sa imong pagsabot sa reseta. Sunda kanunay ang instruksyon sa imong doktor.'
      : '[Mock] This information helps you understand your prescription. Always follow your doctor\'s instructions.',
  };
}

// ─── Public API ─────────────────────────────────────────────────────────

export async function analyzeImage(
  imageBase64: string,
  type: 'prescription' | 'lab_result',
  language: string,
  symptoms?: string,
): Promise<string> {
  const client = createClient();

  if (!client) {
    console.warn('AWS Bedrock credentials missing. Returning mock analysis.');
    return JSON.stringify(getMockScanResponse(type, language));
  }

  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const system = getSystemPrompt(type, language, symptoms);
  const userPrompt = getScanUserPrompt(type, language);

  try {
    return await invokeModel(system, [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64Data },
          },
          { type: 'text', text: userPrompt },
        ],
      },
    ]);
  } catch (err) {
    console.error('AWS Bedrock analyzeImage failed, falling back to mock:', err);
    return JSON.stringify(getMockScanResponse(type, language));
  }
}

export async function analyzeInteractions(prompt: string): Promise<string> {
  const client = createClient();

  if (!client) {
    console.warn('AWS Bedrock credentials missing. Returning mock interactions.');
    return JSON.stringify({ interaction_warnings: [] });
  }

  try {
    return await invokeModel(
      'You are a clinical pharmacist AI. Respond with ONLY valid JSON.',
      [{ role: 'user', content: prompt }],
      2048,
    );
  } catch (err) {
    console.error('AWS Bedrock interaction query failed, falling back to mock:', err);
    return JSON.stringify({ interaction_warnings: [] });
  }
}

export async function chat(
  userMessage: string,
  history: { role: string; content: string }[],
  medications: { drug_name: string; generic_name?: string | null; dosage?: string; frequency?: string; purpose?: string }[],
  language: string,
): Promise<string> {
  const system = getChatSystemPrompt(medications, language);

  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const client = createClient();

  if (!client) {
    console.warn('AWS Bedrock credentials missing. Returning mock chat response.');
    return language === 'bisaya'
      ? 'Salamat sa imong pangutana. Kabahin sa imong tambal, sunda kanunay ang giingon sa imong doktor o parmasyutiko aron luwas ang imong pag-inom.'
      : language === 'filipino'
        ? 'Salamat sa iyong tanong. Tungkol sa iyong gamot, laging sundin ang sinabi ng iyong doktor o parmaseutiko.'
        : 'Thank you for your question. Regarding your medication, always follow your doctor or pharmacist\'s instructions.';
  }

  try {
    return await invokeModel(system, messages, 2048);
  } catch (err) {
    console.error('AWS Bedrock chat failed:', err);
    throw err;
  }
}
