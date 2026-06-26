import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { data: reminders, error: dbError } = await supabase
      .from('reminders')
      .select(`
        id, time, label, is_active, created_at,
        medication:medications ( drug_name, dosage )
      `)
      .eq('user_id', user.id)
      .order('time', { ascending: true });

    if (dbError) throw dbError;

    return NextResponse.json(reminders);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { medication_id, time, label } = await request.json();
    if (!medication_id || !time || !label) {
      return NextResponse.json({ error: 'Missing required reminder parameters.', code: '400' }, { status: 400 });
    }

    const { data: newReminder, error: dbError } = await supabase
      .from('reminders')
      .insert({
        user_id: user.id,
        medication_id,
        time,
        label,
        is_active: true
      })
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(newReminder);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
