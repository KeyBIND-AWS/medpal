import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Notification history for the Notifications tab (most recent first).
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { data, error: dbError } = await supabase
      .from('notification_logs')
      .select('id, title, body, type, reminder_id, sent_at, read_at')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (dbError) throw dbError;

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

// Mark notification(s) as read. Body: { ids: string[] } or { all: true }.
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { ids, all } = await request.json().catch(() => ({}));

    let query = supabase
      .from('notification_logs')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);

    if (!all) {
      if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: 'Provide ids[] or all:true.', code: '400' }, { status: 400 });
      }
      query = query.in('id', ids);
    }

    const { error: dbError } = await query;
    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
