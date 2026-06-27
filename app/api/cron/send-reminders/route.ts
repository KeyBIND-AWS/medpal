import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// web-push relies on Node crypto — never bundle this route for the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@medpal.app';
const CRON_SECRET = process.env.CRON_SECRET;

// Static notification copy, localized to the user's saved language preference.
const COPY = {
  english:  { title: '💊 MedPal Reminder',         take: 'Time to take' },
  filipino: { title: '💊 Paalala ng MedPal',       take: 'Oras nang inumin ang' },
  bisaya:   { title: '💊 Pahinumdom sa MedPal',    take: 'Oras na sa pag-inom sa' },
};

// Reminders are stored as wall-clock "HH:MM"; this is a Filipino health app, so
// match against Philippine Standard Time (UTC+8, no DST).
function manilaHHMM(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

function normalizeHHMM(t: unknown): string {
  const m = String(t).match(/^(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : String(t);
}

async function handle(request: NextRequest) {
  // 1. Shared-secret gate (external cron / scheduler must send this header).
  const authHeader = request.headers.get('authorization');
  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Required server config.
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  }
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: 'Missing VAPID keys.' }, { status: 500 });
  }

  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  // Service-role client: the cron has no user session and must read across users
  // and write logs, which RLS would otherwise block.
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const now = manilaHHMM();

  // 3. Active reminders due this minute.
  const { data: reminders, error: remErr } = await supabase
    .from('reminders')
    .select('id, user_id, time, label, medication:medications(drug_name, dosage)')
    .eq('is_active', true);

  if (remErr) {
    return NextResponse.json({ error: remErr.message }, { status: 500 });
  }

  const due = (reminders || []).filter((r) => normalizeHHMM(r.time) === now);
  if (due.length === 0) {
    return NextResponse.json({ ok: true, now, due: 0, sent: 0 });
  }

  // 4. Skip reminders already pushed in the last ~90s (guards against the cron
  //    firing more than once within the same minute).
  const since = new Date(Date.now() - 90 * 1000).toISOString();
  const { data: recentLogs } = await supabase
    .from('notification_logs')
    .select('reminder_id')
    .in('reminder_id', due.map((r) => r.id))
    .gte('sent_at', since);
  const alreadySent = new Set((recentLogs || []).map((l) => l.reminder_id));
  const pending = due.filter((r) => !alreadySent.has(r.id));

  if (pending.length === 0) {
    return NextResponse.json({ ok: true, now, due: due.length, skipped: due.length, sent: 0 });
  }

  const userIds = [...new Set(pending.map((r) => r.user_id))];

  // 5. Language prefs + subscriptions for the affected users.
  const { data: users } = await supabase
    .from('users')
    .select('id, language_pref')
    .in('id', userIds);
  const langById = new Map(
    (users || []).map((u) => [u.id, String(u.language_pref || 'bisaya').toLowerCase()])
  );

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth_key')
    .in('user_id', userIds);
  const subsByUser = new Map<string, any[]>();
  for (const s of subs || []) {
    const arr = subsByUser.get(s.user_id) || [];
    arr.push(s);
    subsByUser.set(s.user_id, arr);
  }

  let sent = 0;
  const expiredSubIds: string[] = [];

  for (const r of pending) {
    const userSubs = subsByUser.get(r.user_id) || [];
    // No registered devices → nothing to deliver, and we avoid orphan feed logs.
    if (userSubs.length === 0) continue;

    const lang = langById.get(r.user_id) || 'bisaya';
    const copy = COPY[lang as keyof typeof COPY] || COPY.english;
    const med: any = Array.isArray(r.medication) ? r.medication[0] : r.medication;
    const drug = med?.drug_name || 'your medication';
    const dosage = med?.dosage ? ` ${med.dosage}` : '';
    const title = copy.title;
    const body = `${copy.take} ${drug}${dosage}${r.label ? ` · ${r.label}` : ''}`;

    // Log first so the click payload can carry the log id.
    const { data: log } = await supabase
      .from('notification_logs')
      .insert({ user_id: r.user_id, title, body, type: 'reminder', reminder_id: r.id })
      .select('id')
      .single();

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: `reminder-${r.id}`,
      requireInteraction: false,
      data: { url: '/notifications', notificationId: log?.id },
    });

    await Promise.all(
      userSubs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
            payload
          );
          sent++;
        } catch (err: any) {
          // 404/410 mean the subscription is gone — prune it.
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            expiredSubIds.push(s.id);
          }
        }
      })
    );
  }

  // 6. Clean up dead subscriptions.
  if (expiredSubIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', expiredSubIds);
  }

  return NextResponse.json({
    ok: true,
    now,
    due: due.length,
    sent,
    pruned: expiredSubIds.length,
  });
}

// Vercel Cron triggers the endpoint with GET; manual/external callers may POST.
// Both run the same logic (Vercel auto-attaches `Authorization: Bearer CRON_SECRET`).
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
