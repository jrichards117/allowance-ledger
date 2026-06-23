-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)
-- If you already ran the previous schema, just run the NEW TABLES section below

-- ── Existing tables (safe to re-run) ─────────────────────────────────────────

create table if not exists transactions (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  amount      numeric(8,2) not null,
  reason      text not null,
  week_start  date not null,
  created_at  timestamptz default now()
);

create table if not exists presets (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  label       text not null,
  amount      numeric(8,2) not null,
  type        text not null check (type in ('deduct', 'bonus')),
  created_at  timestamptz default now()
);

create table if not exists settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

insert into settings (key, value) values
  ('allowance_Noah',  '40'),
  ('allowance_Jonah', '40'),
  ('allowance_Leah',  '40')
on conflict (key) do nothing;

-- ── NEW TABLES ────────────────────────────────────────────────────────────────

-- Transfer presets
create table if not exists transfer_presets (
  id          bigint generated always as identity primary key,
  from_kid    text not null check (from_kid in ('Noah', 'Jonah', 'Leah')),
  to_kid      text not null check (to_kid in ('Noah', 'Jonah', 'Leah')),
  amount      numeric(8,2) not null,
  reason      text not null,
  created_at  timestamptz default now()
);

-- Chore definitions
create table if not exists chores (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  label       text not null,
  chore_type  text not null check (chore_type in ('daily', 'weekly')),
  penalty     numeric(8,2) not null default 0,
  sort_order  int not null default 0,
  created_at  timestamptz default now()
);

-- Chore completions (checked off)
create table if not exists chore_completions (
  id          bigint generated always as identity primary key,
  chore_id    bigint not null references chores(id) on delete cascade,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  week_start  date not null,
  day_of_week int,  -- 0=Mon..6=Sun for daily chores, null for weekly
  completed   boolean not null default true,
  created_at  timestamptz default now(),
  unique (chore_id, week_start, day_of_week)
);

-- ── Row Level Security ────────────────────────────────────────────────────────

alter table transactions       enable row level security;
alter table presets            enable row level security;
alter table settings           enable row level security;
alter table transfer_presets   enable row level security;
alter table chores             enable row level security;
alter table chore_completions  enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='transactions' and policyname='Allow all') then
    create policy "Allow all" on transactions for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='presets' and policyname='Allow all') then
    create policy "Allow all" on presets for all using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename='settings' and policyname='Allow all') then
    create policy "Allow all" on settings for all using (true) with check (true);
  end if;
end $$;

create policy if not exists "Allow all" on transfer_presets  for all using (true) with check (true);
create policy if not exists "Allow all" on chores            for all using (true) with check (true);
create policy if not exists "Allow all" on chore_completions for all using (true) with check (true);
