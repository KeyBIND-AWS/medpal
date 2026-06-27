import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: recordId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    // 1. Try to fetch from scans
    const { data: recordDetails, error: dbError } = await supabase
      .from('scans')
      .select(`
        id,
        type,
        summary,
        ai_response,
        created_at,
        medications (
          id,
          drug_name,
          generic_name,
          dosage,
          frequency,
          timing,
          duration,
          purpose,
          instructions,
          warnings,
          start_date,
          end_date,
          rxcui,
          rxnorm_verified
        )
      `)
      .eq('id', recordId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (dbError) throw dbError;

    if (recordDetails) {
      return NextResponse.json(recordDetails);
    }

    // 2. Fallback to medications for orphan entries (with null scan_id)
    const { data: medication, error: medError } = await supabase
      .from('medications')
      .select('*')
      .eq('id', recordId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (medError) throw medError;

    if (medication) {
      const synthesizedRecord = {
        id: medication.id,
        type: 'prescription',
        summary: medication.drug_name,
        ai_response: {},
        created_at: medication.created_at,
        medications: [
          {
            id: medication.id,
            drug_name: medication.drug_name,
            generic_name: medication.generic_name,
            dosage: medication.dosage,
            frequency: medication.frequency,
            timing: medication.timing,
            duration: medication.duration,
            purpose: medication.purpose,
            instructions: medication.instructions,
            warnings: medication.warnings,
            start_date: medication.start_date,
            end_date: medication.end_date
          }
        ]
      };
      return NextResponse.json(synthesizedRecord);
    }

    return NextResponse.json({ error: 'Record not found', code: '404' }, { status: 404 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id: recordId } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    // 1. Try deleting from scans (which cascades across foreign key dependencies)
    const { data: deletedScan, error: deleteError } = await supabase
      .from('scans')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id)
      .select();

    if (deleteError) throw deleteError;

    // 2. Fallback: if no scan row matched, delete from medications table directly
    if (!deletedScan || deletedScan.length === 0) {
      const { error: medDeleteError } = await supabase
        .from('medications')
        .delete()
        .eq('id', recordId)
        .eq('user_id', user.id);
      if (medDeleteError) throw medDeleteError;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
