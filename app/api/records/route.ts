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

    // 1. Fetch scans
    let scansQuery = supabase
      .from('scans')
      .select('id, type, summary, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (typeFilter) {
      scansQuery = scansQuery.eq('type', typeFilter);
    }

    const { data: scans, error: scansError } = await scansQuery;
    if (scansError) throw scansError;

    // 2. Fetch orphan medications (scan_id is null)
    let medsQuery = supabase
      .from('medications')
      .select('id, drug_name, created_at')
      .eq('user_id', user.id)
      .is('scan_id', null)
      .order('created_at', { ascending: false });

    const { data: meds, error: medsError } = await medsQuery;
    if (medsError) throw medsError;

    // 3. Map medications to virtual scan records
    const virtualScans = (meds || []).map((m: any) => ({
      id: m.id,
      type: 'prescription' as const,
      summary: m.drug_name,
      created_at: m.created_at
    }));

    // 4. Merge and sort chronologically
    const allRecords = [...(scans || []), ...virtualScans];

    let filteredRecords = allRecords;
    if (typeFilter === 'lab_result') {
      filteredRecords = allRecords.filter(r => r.type === 'lab_result');
    } else if (typeFilter === 'prescription') {
      filteredRecords = allRecords.filter(r => r.type === 'prescription');
    }

    filteredRecords.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(filteredRecords);
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
    const { drug_name, dosage, frequency, purpose, timing, instructions, start_date, end_date, warnings } = body;

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

    // 4. Insert into medications table directly
    const { data: medRow, error: medError } = await supabase
      .from('medications')
      .insert({
        user_id: user.id,
        scan_id: null,
        drug_name: drug_name.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        purpose: purpose && purpose.trim() !== '' ? purpose.trim() : 'Not specified',
        timing: timing || [],
        instructions: instructions && instructions.trim() !== '' ? instructions.trim() : 'See product packaging',
        warnings: warnings && warnings.trim() !== '' ? warnings.trim() : null,
        start_date: start_date || null,
        end_date: end_date || null,
        is_active: true
      })
      .select()
      .single();

    if (medError) {
      console.error('Supabase DB error:', medError);
      throw medError;
    }

    return NextResponse.json({ success: true, record: medRow });
  } catch (error) {
    console.error('API Server Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
