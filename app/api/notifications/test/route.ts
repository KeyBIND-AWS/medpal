import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import webpush from 'web-push';

// web-push needs Node crypto.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@medpal.app';

// Demo helper: immediately push a test notification to the caller's own devices,
// bypassing the schedule. User-scoped (only the signed-in user's subscriptions),
// so it needs no CRON_SECRET or service-role key.
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized', code: '401' }, { status: 401 });
    }

    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
      return NextResponse.json({ error: 'Push not configured (missing VAPID keys).', code: '500' }, { status: 500 });
    }
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const { data: subs, error: subErr } = await supabase
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth_key')
      .eq('user_id', user.id);
    if (subErr) throw subErr;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ error: 'No device is subscribed yet. Turn on push first.', code: '400' }, { status: 400 });
    }

    const title = '💊 MedPal Reminder';
    const body = 'This is a test notification — push is working! 🎉';

    // Log it so it also appears in the in-app feed.
    const { data: log } = await supabase
      .from('notification_logs')
      .insert({ user_id: user.id, title, body, type: 'test' })
      .select('id')
      .single();

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: 'test',
      requireInteraction: false,
      data: { url: '/notifications', notificationId: log?.id },
    });

    let sent = 0;
    const expired: string[] = [];
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload
          );
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) expired.push(s.id);
        }
      })
    );

    if (expired.length) {
      await supabase.from('push_subscriptions').delete().in('id', expired);
    }

    return NextResponse.json({ ok: true, sent, devices: subs.length, pruned: expired.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error', code: '500' }, { status: 500 });
  }
}
