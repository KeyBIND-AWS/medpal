-- ============================================================================
-- MedPal — Supabase schema
-- Idempotent: safe to run multiple times. Paste into the Supabase SQL Editor
-- (Dashboard → SQL Editor → New query) and Run.
--
-- After running this, you MUST also enable anonymous sign-ins:
--   Dashboard → Authentication → Sign In / Providers → toggle "Anonymous sign-ins".
-- ============================================================================

-- ── Profile table (1 row per auth user) ────────────────────────────────────
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  language_pref text default 'bisaya',
  created_at    timestamptz default now()
);

-- Auto-create a profile row whenever a new auth user (incl. anonymous) signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Scans (uploaded prescription / lab images + AI analysis) ────────────────
create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text,
  image_url   text,
  ai_response jsonb,
  summary     text,
  language    text,
  created_at  timestamptz default now()
);

-- ── Medications (parsed from a scan) ────────────────────────────────────────
create table if not exists public.medications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  scan_id      uuid references public.scans(id) on delete cascade,
  drug_name    text not null,
  generic_name text,
  dosage       text,
  frequency    text,
  timing       jsonb,
  duration     text,
  purpose      text,
  instructions text,
  warnings     text,
  start_date   date,
  end_date     date,
  rxcui           text,
  rxnorm_verified boolean,
  is_active    boolean default true,
  created_at   timestamptz default now()
);

-- If the medications table already existed from an earlier version, make sure
-- the newer columns are present (no-op when they already exist):
alter table public.medications add column if not exists start_date date;
alter table public.medications add column if not exists end_date   date;
alter table public.medications add column if not exists warnings   text;
alter table public.medications add column if not exists timing     jsonb;
alter table public.medications add column if not exists scan_id    uuid references public.scans(id) on delete cascade;
alter table public.medications add column if not exists rxcui           text;
alter table public.medications add column if not exists rxnorm_verified boolean;

-- ── Chat messages (MedPal AI chatbot history) ──────────────────────────────
create table if not exists public.chat_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       text not null,
  content    text not null,
  created_at timestamptz default now()
);

-- ── Records (manually-added medication entries) ────────────────────────────
create table if not exists public.records (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  drug_name    text not null,
  dosage       text,
  frequency    text,
  purpose      text,
  timing       jsonb default '[]'::jsonb,
  instructions text,
  created_at   timestamptz default now()
);

-- ── Reminders (medication reminders) ───────────────────────────────────────
create table if not exists public.reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  medication_id uuid references public.medications(id) on delete cascade,
  time          text not null,
  label         text not null,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── Push subscriptions (one row per browser/device that enabled push) ───────
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null,
  p256dh     text not null,
  auth_key   text not null,
  created_at timestamptz default now(),
  unique (user_id, endpoint)
);

-- ── Notification logs (history shown in the Notifications tab) ──────────────
create table if not exists public.notification_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  body        text not null,
  type        text not null default 'reminder',
  reminder_id uuid references public.reminders(id) on delete set null,
  sent_at     timestamptz default now(),
  read_at     timestamptz
);

-- ── Row Level Security ─────────────────────────────────────────────────────
alter table public.users              enable row level security;
alter table public.scans              enable row level security;
alter table public.medications        enable row level security;
alter table public.chat_messages      enable row level security;
alter table public.records            enable row level security;
alter table public.reminders          enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_logs  enable row level security;

-- users: a user can only see/modify their own profile row
drop policy if exists users_select_own on public.users;
create policy users_select_own on public.users for select using (auth.uid() = id);
drop policy if exists users_insert_own on public.users;
create policy users_insert_own on public.users for insert with check (auth.uid() = id);
drop policy if exists users_update_own on public.users;
create policy users_update_own on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

-- scans / medications / chat_messages / records / reminders: own rows only
drop policy if exists scans_all_own on public.scans;
create policy scans_all_own on public.scans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists medications_all_own on public.medications;
create policy medications_all_own on public.medications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists chat_messages_all_own on public.chat_messages;
create policy chat_messages_all_own on public.chat_messages for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists records_all_own on public.records;
create policy records_all_own on public.records for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists reminders_all_own on public.reminders;
create policy reminders_all_own on public.reminders for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists push_subscriptions_all_own on public.push_subscriptions;
create policy push_subscriptions_all_own on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- notification_logs: users may read/update (mark read) their own; the cron writes
-- with the service-role key, which bypasses RLS, so no insert policy is needed here.
drop policy if exists notification_logs_all_own on public.notification_logs;
create policy notification_logs_all_own on public.notification_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Storage bucket for scan images ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('scans', 'scans', false)
on conflict (id) do nothing;

-- Each user can only touch files under a folder named after their own uid:
--   <user_id>/<timestamp>.jpg   (see app/api/scan/route.ts)
drop policy if exists scans_storage_insert_own on storage.objects;
create policy scans_storage_insert_own on storage.objects for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists scans_storage_select_own on storage.objects;
create policy scans_storage_select_own on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists scans_storage_update_own on storage.objects;
create policy scans_storage_update_own on storage.objects for update to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists scans_storage_delete_own on storage.objects;
create policy scans_storage_delete_own on storage.objects for delete to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── TTS audio cache (shared, non-PHI synthesized medication speech) ─────────
-- If the 'scans' bucket restricts MIME types (e.g. configured image-only via the
-- dashboard), make sure cached TTS audio (audio/wav) is also permitted. No-op
-- when allowed_mime_types is NULL (all types already allowed) or already present.
update storage.buckets
set allowed_mime_types = allowed_mime_types || array['audio/wav']
where id = 'scans'
  and allowed_mime_types is not null
  and not ('audio/wav' = any(allowed_mime_types));

-- Generated WAVs live under the 'tts/' prefix of the 'scans' bucket and are
-- keyed by sha256(lang+text), so they're shared across users (synthesize once).
-- The uid-scoped policies above don't apply (first path segment is 'tts', not a
-- uid), so any authenticated user may read/write under this prefix. Safe: the
-- text is generic medication instruction speech, never patient-identifying.
drop policy if exists scans_storage_tts_select on storage.objects;
create policy scans_storage_tts_select on storage.objects for select to authenticated
  using (bucket_id = 'scans' and (storage.foldername(name))[1] = 'tts');
drop policy if exists scans_storage_tts_insert on storage.objects;
create policy scans_storage_tts_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'scans' and (storage.foldername(name))[1] = 'tts');
