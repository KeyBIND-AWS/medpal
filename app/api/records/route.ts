import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    let query = supabase
      .from('scans')
      .select('id, type, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    const { data: records, error: dbError } = await query;
    if (dbError) throw dbError;

    return NextResponse.json(records);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { drug_name, dosage, frequency, purpose, timing, instructions } = body;

    // 3. Server-side validation
    if (!drug_name || drug_name.trim() === '') {
      return NextResponse.json({ error: 'Drug name is required' }, { status: 400 });
    }
    if (!dosage || dosage.trim() === '') {
      return NextResponse.json({ error: 'Dosage is required' }, { status: 400 });
    }
    if (!frequency || frequency.trim() === '') {
      return NextResponse.json({ error: 'Frequency is required' }, { status: 400 });
    }

    // 4. Insert a scans row (manual entries have no image/AI output — placeholders, not null)
    const { data: scanRow, error: scanError } = await supabase
      .from('scans')
      .insert({
        user_id: user.id,
        type: 'prescription',
        image_url: 'manual-entry',
        ai_response: {},
        summary: drug_name.trim(),
        language: 'english',
      })
      .select()
      .single();

    if (scanError) {
      console.error('Supabase DB error (scans):', scanError);
      throw scanError;
    }

    // 5. Insert the medication row tied to the new scan
    const { data: medRow, error: medError } = await supabase
      .from('medications')
      .insert({
        user_id: user.id,
        scan_id: scanRow.id,
        drug_name: drug_name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        timing: timing || null,
        purpose: purpose ? purpose.trim() : 'Not specified',
        instructions: instructions ? instructions.trim() : 'See product packaging',
        is_active: true,
      })
      .select()
      .single();

    if (medError) {
      console.error('Supabase DB error (medications):', medError);
      throw medError;
    }

    return NextResponse.json({ success: true, record: scanRow, medication: medRow });
  } catch (error) {
    console.error('API Server Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
