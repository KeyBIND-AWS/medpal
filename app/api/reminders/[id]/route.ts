import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { time, label, is_active } = await request.json();

    const updateData: any = {};
    if (time !== undefined) updateData.time = time;
    if (label !== undefined) updateData.label = label;
    if (is_active !== undefined) updateData.is_active = is_active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update.', code: '400' }, { status: 400 });
    }

    const { data: updatedReminder, error: dbError } = await supabase
      .from('reminders')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (dbError) throw dbError;

    return NextResponse.json(updatedReminder);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient();
    const { id } = await context.params;

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { error: deleteError } = await supabase
      .from('reminders')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
