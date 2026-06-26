import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzePrescriptionImage } from '@/lib/prescription';
import { analyzeImage } from '@/lib/bedrock';
import { preprocessScanImage } from '@/lib/image-preprocess';

/**
 * Run the scan analysis. Primary engine = Bedrock Claude vision (reads the whole
 * document, handles multiple medications, accepts the normalized JPEG). If the
 * vision call returns unparseable JSON, fall back to the Textract + Comprehend
 * Medical pipeline so we always return *something* structured.
 */
async function analyzeScan(
  cleanImage: string,
  type: 'prescription' | 'lab_result',
  language: string,
  symptoms?: string,
): Promise<any> {
  const visionStr = await analyzeImage(cleanImage, type, language, symptoms);
  try {
    let s = visionStr.trim();
    if (s.startsWith('```')) {
      s = s.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }
    return JSON.parse(s);
  } catch (parseErr) {
    console.error('Bedrock vision JSON parse failed; falling back to Textract:', parseErr);
    return analyzePrescriptionImage(cleanImage, language);
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Session Authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized user access token.', code: '401' },
        { status: 401 }
      );
    }

    const { image, type, language, symptoms } = await req.json();

    if (!image || !type || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: image, type, or language.', code: '400' },
        { status: 400 }
      );
    }

    // 2. Normalize the image to a clean, upright JPEG. This makes WebP/HEIC/PNG
    //    gallery uploads work (Textract only accepts JPEG/PNG/PDF/TIFF, and Claude
    //    vision is happiest with JPEG), fixes EXIF orientation, and returns BARE
    //    base64 (no data: prefix) so the storage upload below isn't corrupted.
    const cleanImage = await preprocessScanImage(image);

    // 3. Upload the normalized image to Supabase Storage Bucket ('scans')
    const imageBuffer = Buffer.from(cleanImage, 'base64');
    const fileName = `${user.id}/${Date.now()}.jpg`;

    const { data: storageData, error: storageError } = await supabase.storage
      .from('scans')
      .upload(fileName, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (storageError) {
      console.error('POST /api/scan storage upload failed:', storageError);
      return NextResponse.json(
        { error: `Cloud storage file upload infrastructure failure: ${storageError.message}`, code: 'STORAGE_ERROR' },
        { status: 500 }
      );
    }

    // 4. Analyze (Bedrock vision primary, Textract fallback) with a 30s timeout
    let aiPayload: any;
    try {
      aiPayload = await Promise.race([
        analyzeScan(cleanImage, type, language, symptoms),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI processing gateway timeout.')), 30000)
        )
      ]);
    } catch (timeoutErr: any) {
      return NextResponse.json(
        { error: timeoutErr.message || 'AI engine timeout.', code: 'AI_TIMEOUT' },
        { status: 504 }
      );
    }

    // 5. Handle Illegible Handwriting Fallback Path
    if (!aiPayload.readable) {
      return NextResponse.json(
        { error: "We couldn't read this -- ask your pharmacist.", code: 'UNREADABLE' },
        { status: 400 }
      );
    }

    // 6. Save metadata to scans table. We stash the user's symptoms (and keep the
    //    model's mismatch_warning) inside the ai_response JSONB so no schema
    //    migration is needed — the results page reads them from ai_response.
    const aiResponseToStore = {
      ...aiPayload,
      symptoms: symptoms && symptoms.trim() ? symptoms.trim() : null,
    };

    const { data: scanRow, error: scanDbError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        type: type,
        image_url: storageData.path,
        ai_response: aiResponseToStore,
        summary: aiPayload.summary,
        language: language
      })
      .select()
      .single();

    if (scanDbError) throw scanDbError;

    // 7. Map and insert individual records into medications table
    if (aiPayload.medications && Array.isArray(aiPayload.medications)) {
      const formattedMeds = aiPayload.medications.map((med: any) => ({
        user_id: user.id,
        scan_id: scanRow.id,
        drug_name: med.drug_name,
        generic_name: med.generic_name || null,
        dosage: med.dosage,
        frequency: med.frequency,
        timing: med.timing || null,
        duration: med.duration || null,
        purpose: med.purpose,
        instructions: med.instructions,
        warnings: med.warnings || null,
        is_active: true
      }));

      const { error: medsDbError } = await supabase
        .from('medications')
        .insert(formattedMeds);

      if (medsDbError) throw medsDbError;
    }

    return NextResponse.json({
      scan_id: scanRow.id,
      summary: scanRow.summary,
      medications: aiPayload.medications
    });

  } catch (globalError: any) {
    console.error('POST /api/scan failed:', globalError);
    return NextResponse.json(
      { error: globalError.message || 'Unexpected backend transaction failure.', code: '500' },
      { status: 500 }
    );
  }
}
