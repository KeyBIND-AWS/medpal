import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';
import { ComprehendMedicalClient, DetectEntitiesV2Command } from '@aws-sdk/client-comprehendmedical';

const CONFIDENCE_THRESHOLD = 70.0;

function hasAwsCredentials(): boolean {
  return !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

function getTextractClient(): TextractClient | null {
  if (!hasAwsCredentials()) return null;
  return new TextractClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getComprehendMedicalClient(): ComprehendMedicalClient | null {
  if (!hasAwsCredentials()) return null;
  return new ComprehendMedicalClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getMockPrescription(language: string) {
  const isBisaya = language === 'bisaya';
  const isFilipino = language === 'filipino';

  return {
    readable: true,
    patient_name: 'John Doe',
    summary: isBisaya
      ? '[Mock Textract] Reseta alang ni John Doe para sa Amoxicillin, Paracetamol.'
      : isFilipino
        ? '[Mock Textract] Reseta para kay John Doe para sa Amoxicillin, Paracetamol.'
        : '[Mock Textract] Prescription for John Doe containing Amoxicillin, Paracetamol.',
    medications: [
      {
        drug_name: 'Amoxicillin',
        generic_name: 'Amoxicillin Trihydrate',
        dosage: '500mg',
        frequency: isBisaya ? 'Katulo sa usa ka adlaw' : 'Three times daily',
        timing: null,
        duration: '7 days',
        purpose: isBisaya ? 'Impeksyon sa bakterya' : 'Bacterial infection',
        instructions: isBisaya
          ? '[Mock] Imna ang 1 ka kapsula matag 8 ka oras. Hurota ang tibuok nga kurso.'
          : '[Mock] Take 1 capsule every 8 hours. Finish the entire course.',
        warnings: isBisaya
          ? '[Mock] Mahimong makasakit sa tiyan. Imna human sa pagkaon.'
          : '[Mock] May cause stomach upset. Take after meals.',
      },
      {
        drug_name: 'Paracetamol',
        generic_name: 'Acetaminophen',
        dosage: '500mg',
        frequency: isBisaya ? 'Kada 4 ka oras kon gikinahanglan' : 'Every 4 hours as needed',
        timing: null,
        duration: '3 days',
        purpose: isBisaya ? 'Hilanat ug sakit sa lawas' : 'Fever and pain relief',
        instructions: isBisaya
          ? '[Mock] Imna ang 1 ka tablet kada 4 ka oras alang sa hilanat.'
          : '[Mock] Take 1 tablet every 4 hours for fever.',
        warnings: null,
      },
    ],
    disclaimer: isBisaya
      ? '[Mock] Kini nga impormasyon para lang makatabang sa imong pagsabot. Konsultaha kanunay ang imong doktor.'
      : '[Mock] This information helps you understand your prescription. Always consult your doctor.',
  };
}

export interface ParsingResult {
  readable: boolean;
  patient_name?: string;
  summary: string;
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
  }>;
  disclaimer: string;
}

/**
 * Analyzes prescription images using Amazon Textract Queries as the primary engine.
 * If results are missing or confidence is low, it falls back to Amazon Comprehend Medical.
 */
export async function analyzePrescriptionImage(
  imageBase64: string,
  language: string
): Promise<ParsingResult> {
  const textractClient = getTextractClient();

  if (!textractClient) {
    console.warn('AWS credentials missing. Returning mock Textract prescription parse.');
    return getMockPrescription(language);
  }

  // Normalize base64 image data
  const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imageBuffer = Buffer.from(base64Data, 'base64');

  try {
    const textractCommand = new AnalyzeDocumentCommand({
      Document: {
        Bytes: imageBuffer,
      },
      FeatureTypes: ['QUERIES'],
      QueriesConfig: {
        Queries: [
          { Text: 'What is the name of the medication?', Alias: 'MEDICATION' },
          { Text: 'What is the dosage or frequency?', Alias: 'DOSAGE' },
          { Text: 'What is the patient name?', Alias: 'PATIENT' },
        ],
      },
    });

    const textractResponse = await textractClient.send(textractCommand);
    const blocks = textractResponse.Blocks || [];

    // Build block lookup map
    const blockMap = new Map<string, any>();
    for (const block of blocks) {
      if (block.Id) {
        blockMap.set(block.Id, block);
      }
    }

    // Default structure to store Textract results
    const results: Record<string, { text: string; confidence: number }> = {
      MEDICATION: { text: '', confidence: 0 },
      DOSAGE: { text: '', confidence: 0 },
      PATIENT: { text: '', confidence: 0 },
    };

    const queryBlocks = blocks.filter((b) => b.BlockType === 'QUERY');

    for (const qBlock of queryBlocks) {
      const alias = qBlock.Query?.Alias;
      if (!alias || !(alias in results)) continue;

      const relationships = qBlock.Relationships || [];
      const answerIds: string[] = [];
      for (const rel of relationships) {
        if (rel.Type === 'ANSWER' && rel.Ids) {
          answerIds.push(...rel.Ids);
        }
      }

      let mergedText = '';
      let minConfidence = 100.0;
      let count = 0;

      for (const id of answerIds) {
        const resBlock = blockMap.get(id);
        if (resBlock && resBlock.BlockType === 'QUERY_RESULT') {
          const text = resBlock.Text || '';
          const confidence = resBlock.Confidence ?? 100.0;
          if (text) {
            mergedText = mergedText ? `${mergedText} ${text}` : text;
            minConfidence = Math.min(minConfidence, confidence);
            count++;
          }
        }
      }

      if (count > 0) {
        results[alias] = {
          text: mergedText.trim(),
          confidence: minConfidence,
        };
      }
    }

    // Determine if we need to fall back or run Comprehend Medical for multi-medication extraction
    const needsFallback =
      !results.MEDICATION.text ||
      results.MEDICATION.confidence < CONFIDENCE_THRESHOLD ||
      !results.DOSAGE.text ||
      results.DOSAGE.confidence < CONFIDENCE_THRESHOLD ||
      !results.PATIENT.text ||
      results.PATIENT.confidence < CONFIDENCE_THRESHOLD;

    const lineBlocks = blocks.filter((b) => b.BlockType === 'LINE');
    const rawText = lineBlocks.map((b) => b.Text).join('\n');

    const shouldRunComprehend = needsFallback || lineBlocks.length > 1;
    const detectedMeds: Array<any> = [];

    const isBisaya = language === 'bisaya';
    const isFilipino = language === 'filipino';

    if (shouldRunComprehend && rawText.trim()) {
      console.log('Querying Amazon Comprehend Medical to parse structured medical entities...');
      const compMedicalClient = getComprehendMedicalClient();
      if (compMedicalClient) {
        try {
          const comprehendCommand = new DetectEntitiesV2Command({
            Text: rawText,
          });
          const compMedicalResponse = await compMedicalClient.send(comprehendCommand);
          const entities = compMedicalResponse.Entities || [];

          // Extract all medication entities
          const medEntities = entities.filter((e) => e.Category === 'MEDICATION');
          for (const med of medEntities) {
            if (med.Text) {
              const attributes = med.Attributes || [];
              const dosageAttr = attributes.find((a) => a.Type === 'DOSAGE');
              const freqAttr = attributes.find((a) => a.Type === 'FREQUENCY');
              const durationAttr = attributes.find((a) => a.Type === 'DURATION');

              let combinedDosage = '';
              if (dosageAttr?.Text) combinedDosage += dosageAttr.Text;
              
              let frequency = '';
              if (freqAttr?.Text) {
                frequency = freqAttr.Text;
              }

              detectedMeds.push({
                drug_name: med.Text,
                generic_name: null,
                dosage: combinedDosage || 'As directed',
                frequency: frequency || 'As directed',
                timing: null,
                duration: durationAttr?.Text || null,
                purpose: isBisaya ? 'Sumala sa reseta' : isFilipino ? 'Ayon sa reseta' : 'As prescribed',
                instructions: isBisaya
                  ? `Imna sumala sa direksyon: ${combinedDosage || ''} ${frequency || ''}`.trim() || 'Sumala sa reseta'
                  : isFilipino
                    ? `Inumin ayon sa direksyon: ${combinedDosage || ''} ${frequency || ''}`.trim() || 'Ayon sa reseta'
                    : `Take as directed: ${combinedDosage || ''} ${frequency || ''}`.trim() || 'As prescribed',
                warnings: null,
              });
            }
          }

          // Extract patient name (Category: PROTECTED_HEALTH_INFORMATION, Type: NAME)
          const phiNameEntities = entities.filter(
            (e) => e.Category === 'PROTECTED_HEALTH_INFORMATION' && e.Type === 'NAME'
          );
          let fallbackPatient = '';
          let fallbackPatientScore = 0;

          for (const nameEnt of phiNameEntities) {
            const score = nameEnt.Score ?? 0;
            if (nameEnt.Text && score > fallbackPatientScore) {
              fallbackPatientScore = score;
              fallbackPatient = nameEnt.Text;
            }
          }

          if (fallbackPatient && (!results.PATIENT.text || results.PATIENT.confidence < CONFIDENCE_THRESHOLD)) {
            results.PATIENT = {
              text: fallbackPatient,
              confidence: fallbackPatientScore * 100,
            };
          }
        } catch (compMedErr) {
          console.error('Error running Amazon Comprehend Medical:', compMedErr);
        }
      }
    }

    // Merge/resolve final list of medications
    let finalMedications = [];
    if (detectedMeds.length > 0) {
      finalMedications = detectedMeds;
    } else {
      // Run the regex parser fallback on raw text
      const regexMeds = extractMedsFromTextRegex(rawText, language);
      if (regexMeds.length > 0) {
        console.log(`Fallback regex parser found ${regexMeds.length} medications.`);
        finalMedications = regexMeds;
      } else if (results.MEDICATION.text) {
        finalMedications = [
          {
            drug_name: results.MEDICATION.text,
            generic_name: null,
            dosage: results.DOSAGE.text || 'As directed',
            frequency: 'As directed',
            timing: null,
            duration: null,
            purpose: isBisaya ? 'Sumala sa reseta' : isFilipino ? 'Ayon sa reseta' : 'As prescribed',
            instructions: isBisaya
              ? `Imna sumala sa direksyon: ${results.DOSAGE.text || 'sumala sa reseta'}.`
              : isFilipino
                ? `Inumin ayon sa direksyon: ${results.DOSAGE.text || 'ayon sa reseta'}.`
                : `Take as directed: ${results.DOSAGE.text || 'as prescribed'}.`,
            warnings: null,
          },
        ];
      }
    }

    const hasMedication = finalMedications.length > 0;

    let summary = '';
    if (hasMedication) {
      const patientSegment = results.PATIENT.text
        ? (isBisaya ? `para kay ${results.PATIENT.text}` : isFilipino ? `para kay ${results.PATIENT.text}` : `for ${results.PATIENT.text}`)
        : '';
      
      const medNames = finalMedications.map((m) => m.drug_name).join(', ');
      summary = isBisaya
        ? `Nakit-an ang reseta ${patientSegment} nga naglangkob sa: ${medNames}.`
        : isFilipino
          ? `Natagpuan ang reseta ${patientSegment} na naglalaman ng: ${medNames}.`
          : `Prescription found ${patientSegment} containing: ${medNames}.`;
    } else {
      summary = isBisaya
        ? 'Dili mabasa ang detalye sa reseta.'
        : isFilipino
          ? 'Hindi mabasa ang detalye ng reseta.'
          : 'Prescription details could not be parsed.';
    }

    const disclaimer = isBisaya
      ? 'Kini nga impormasyon gikan sa automated analysis. Konsultaha ang imong doktor o parmasyutiko.'
      : isFilipino
        ? 'Ang impormasyong ito ay galing sa automated analysis. Sumangguni sa iyong doktor o parmasyutiko.'
        : 'This information is generated from automated analysis. Always consult your doctor or pharmacist.';

    return {
      readable: hasMedication,
      patient_name: results.PATIENT.text || undefined,
      summary,
      medications: finalMedications,
      disclaimer,
    };

  } catch (err) {
    console.error('Amazon Textract image analysis failed:', err);
    throw err;
  }
}

/**
 * Fallback regex-based parser that isolates multiple medication rows and their dosage attributes 
 * from raw Textract output line-by-line.
 */
function extractMedsFromTextRegex(text: string, language: string): Array<any> {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const results: Array<any> = [];

  const isBisaya = language === 'bisaya';
  const isFilipino = language === 'filipino';

  // Common dosage patterns: e.g. 500mg, 500 mg, 5ml, 1 tab, 1 tablet, 1 capsule, 2 caps, etc.
  const dosageRegex = /(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|tab|tablet|capsule|cap|pc|unit|u|x\b)\b)/i;

  for (const line of lines) {
    // 1. Check if the line is purely an instruction/sig line for the previous medication
    const isSigLine = /^(?:sig|signa|instructions|directions|dir|take|use)[:.\s]/i.test(line);

    if (isSigLine && results.length > 0) {
      const lastMed = results[results.length - 1];
      const sigContent = line.replace(/^(?:sig|signa|instructions|directions|dir|take|use)[:.\s]+/i, '').trim();
      
      if (sigContent) {
        lastMed.frequency = sigContent;
        lastMed.instructions = isBisaya
          ? `Imna sumala sa direksyon: ${sigContent}`
          : isFilipino
            ? `Inumin ayon sa direksyon: ${sigContent}`
            : `Take as directed: ${sigContent}`;
      }
      continue; // Skip creating a new medication card for the instruction line
    }

    const dosageMatch = line.match(dosageRegex);
    if (dosageMatch) {
      const dosage = dosageMatch[1];
      const index = line.indexOf(dosage);
      const drugName = line.substring(0, index).trim()
        .replace(/^[\s\-\+\*•·#rxRx]+/, '') // strip bullet points and Rx symbol
        .replace(/^\d+[\.\s]*/, '') // strip leading list numbers like "1. ", "2) "
        .trim();

      // Get everything after the dosage as the instructions or frequency
      const postDosage = line.substring(index + dosage.length).trim()
        .replace(/^[\s,\-\:\(\)]+/, '') // strip trailing punctuation
        .trim();

      // Avoid capturing headers, names, metadata keywords as medications
      const isMetadataKeyword = /^(patient|doctor|date|prescription|rx|medical|name|age|sex|signature|page|hospital|clinic|tel|phone|address|sig|signa|directions|instructions)$/i.test(drugName);

      if (drugName && drugName.length > 2 && !isMetadataKeyword) {
        results.push({
          drug_name: drugName,
          generic_name: null,
          dosage: dosage,
          frequency: postDosage || 'As directed',
          timing: null,
          duration: null,
          purpose: isBisaya ? 'Sumala sa reseta' : isFilipino ? 'Ayon sa reseta' : 'As prescribed',
          instructions: isBisaya
            ? `Imna sumala sa direksyon: ${dosage} ${postDosage}`.trim() || 'Sumala sa reseta'
            : isFilipino
              ? `Inumin ayon sa direction: ${dosage} ${postDosage}`.trim() || 'Ayon sa reseta'
              : `Take as directed: ${dosage} ${postDosage}`.trim() || 'As prescribed',
          warnings: null,
        });
      }
    }
  }

  return results;
}
