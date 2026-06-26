import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeImage } from '@/lib/bedrock';

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

    const { image, type, language } = await req.json();

    if (!image || !type || !language) {
      return NextResponse.json(
        { error: 'Missing required fields: image, type, or language.', code: '400' },
        { status: 400 }
      );
    }

    // 2. Upload image to Supabase Storage Bucket ('scans')
    const imageBuffer = Buffer.from(image, 'base64');
    const fileExtension = 'jpg'; 
    const fileName = `${user.id}/${Date.now()}.${fileExtension}`;

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

    // 3. Request vision analysis from AWS Bedrock with a 30s timeout protection
    let aiResponseString: string;
    try {
      aiResponseString = await Promise.race([
        analyzeImage(image, type, language),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Bedrock processing gateway timeout.')), 30000)
        )
      ]);
    } catch (timeoutErr: any) {
      return NextResponse.json(
        { error: timeoutErr.message || 'AI engine timeout.', code: 'BEDROCK_TIMEOUT' },
        { status: 504 }
      );
    }

    // Claude sometimes wraps JSON in markdown fences despite instructions not to
    let cleanedResponse = aiResponseString.trim();
    if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const aiPayload = JSON.parse(cleanedResponse);

    // 4. Handle Illegible Handwriting Fallback Path
    if (!aiPayload.readable) {
      return NextResponse.json(
        { error: "We couldn't read this -- ask your pharmacist.", code: 'UNREADABLE' },
        { status: 400 }
      );
    }

    // 5. Save metadata to scans table
    const { data: scanRow, error: scanDbError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        type: type,
        image_url: storageData.path,
        ai_response: aiPayload,
        summary: aiPayload.summary,
        language: language
      })
      .select()
      .single();

    if (scanDbError) throw scanDbError;

    // 6. Map and insert individual records into medications table
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
