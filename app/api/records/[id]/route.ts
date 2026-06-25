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
          warnings
        )
      `)
      .eq('id', recordId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Any DB error here (malformed id, no matching row, etc.) means there's no
    // such record for this user — surface a clean 404 instead of a raw 500.
    if (dbError || !recordDetails) {
      return NextResponse.json({ error: 'Record not found', code: '404' }, { status: 404 });
    }

    return NextResponse.json(recordDetails);
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

    // Deleting the core scan triggers a relational cascade across foreign key dependencies
    const { error: deleteError } = await supabase
      .from('scans')
      .delete()
      .eq('id', recordId)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
