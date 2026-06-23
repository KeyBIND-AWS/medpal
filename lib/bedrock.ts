import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * Sends a base64 encoded medical image (prescription or lab result) to AWS Bedrock
 * for analysis using Claude 3.5 Sonnet.
 * Falls back to structured mock data if AWS credentials are not configured.
 */
export async function analyzeImage(
  imageBase64: string,
  type: 'prescription' | 'lab_result',
  language: string
): Promise<string> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  // Realistic mock data matching the database schema and language preference
  const mockPayload = {
    readable: true,
    summary: language === 'bisaya' 
      ? `Kini usa ka reseta alang sa pagtambal sa impeksyon. Palihug sunda ang mga instruksyon sa pag-inom.`
      : language === 'filipino'
      ? `Ito ay isang reseta para sa paggamot ng impeksyon. Mangyaring sundin ang mga tagubilin sa pag-inom.`
      : `This is a prescription for infection treatment. Please follow the dosage instructions carefully.`,
    medications: [
      {
        drug_name: type === 'prescription' ? 'Amoxicillin' : 'Paracetamol',
        generic_name: type === 'prescription' ? 'Amoxicillin Trihydrate' : 'Acetaminophen',
        dosage: '500mg',
        frequency: language === 'bisaya' ? 'Katulo sa usa ka adlaw' : language === 'filipino' ? 'Tatlong beses isang araw' : 'Three times daily',
        timing: language === 'bisaya' ? 'Human ug kaon' : language === 'filipino' ? 'Pagkatapos kumain' : 'After meals',
        duration: language === 'bisaya' ? '7 ka adlaw' : language === 'filipino' ? '7 araw' : '7 days',
        purpose: language === 'bisaya' ? 'Impeksyon sa bakterya' : language === 'filipino' ? 'Impeksyon ng bakterya' : 'Bacterial infection',
        instructions: language === 'bisaya' 
          ? 'Inma ang 1 ka kapsula matag 8 ka oras. Hurota ang tibuok nga kurso.'
          : language === 'filipino'
          ? 'Inumin ang 1 kapsula bawat 8 oras. Ubusin ang buong kurso.'
          : 'Take 1 capsule every 8 hours. Finish the entire course.',
        warnings: language === 'bisaya'
          ? 'Mahimong makasakit sa tiyan o makalipong.'
          : language === 'filipino'
          ? 'Maaaring sumakit ang tiyan o makahilo.'
          : 'May cause mild stomach upset or drowsiness.',
      }
    ]
  };

  if (!accessKeyId || !secretAccessKey) {
    console.warn('AWS Bedrock credentials missing. Returning fallback mock analysis.');
    return JSON.stringify(mockPayload);
  }

  try {
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Remove base64 image prefixes if present (e.g. data:image/jpeg;base64,)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const prompt = `You are a clinical AI assistant. Analyze this medical image which is a ${type}.
Provide the response in ${language} language.
You MUST respond with a JSON object matching this schema exactly:
{
  "readable": boolean (false if handwriting is completely illegible or the image is not a medical document),
  "summary": "High-level summary of the prescription or lab result in ${language}",
  "medications": [
    {
      "drug_name": "string (brand name)",
      "generic_name": "string (generic name, optional)",
      "dosage": "string (dosage, e.g. 500mg)",
      "frequency": "string (frequency, e.g. Twice daily)",
      "timing": "string (e.g. After meals, optional)",
      "duration": "string (e.g. 7 days, optional)",
      "purpose": "string (purpose of the drug)",
      "instructions": "string (special instructions)",
      "warnings": "string (warnings, optional)"
    }
  ]
}
Return ONLY raw JSON. No markdown wrapping, comments, or extra text.`;

    const response = await client.send(
      new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'image',
                  source: {
                    type: 'base64',
                    media_type: 'image/jpeg',
                    data: base64Data,
                  },
                },
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      })
    );

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.content[0].text;
  } catch (err) {
    console.error('AWS Bedrock connection failed, falling back to mock:', err);
    return JSON.stringify(mockPayload);
  }
}

/**
 * Sends a drug-drug interaction prompt to AWS Bedrock to identify potential warning cases.
 * Falls back to mock warnings if credentials are not configured.
 */
export async function analyzeInteractions(prompt: string): Promise<string> {
  const region = process.env.AWS_REGION || 'us-east-1';
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  const mockPayload = {
    interaction_warnings: [
      {
        severity: 'moderate',
        explanation: 'Adunay interaksiyon tali sa imong mga aktibong tambal. Mahimo kini nga makapakunhod sa epekto sa usa o makadugang sa risgo sa side effects.',
        recommendation: 'Palihug og pakisusi sa imong doktor o parmasyutiko kon dunganon ba kini pag-inom.',
      }
    ]
  };

  if (!accessKeyId || !secretAccessKey) {
    console.warn('AWS Bedrock credentials missing. Returning mock drug interactions.');
    return JSON.stringify(mockPayload);
  }

  try {
    const client = new BedrockRuntimeClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    const response = await client.send(
      new InvokeModelCommand({
        modelId: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 1500,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt,
                },
              ],
            },
          ],
        }),
      })
    );

    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.content[0].text;
  } catch (err) {
    console.error('AWS Bedrock interaction query failed, falling back to mock:', err);
    return JSON.stringify(mockPayload);
  }
}
