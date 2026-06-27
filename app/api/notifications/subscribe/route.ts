import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Store (or refresh) the caller's push subscription.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { endpoint, p256dh, auth } = await request.json();
    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json({ error: 'Missing subscription fields.', code: '400' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .upsert(
        { user_id: user.id, endpoint, p256dh, auth_key: auth },
        { onConflict: 'user_id,endpoint' }
      );

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}

// Remove a subscription (e.g. the user disabled push on this device).
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    const { endpoint } = await request.json();
    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint.', code: '400' }, { status: 400 });
    }

    const { error: dbError } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (dbError) throw dbError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
