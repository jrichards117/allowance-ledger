-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- Transactions table
create table if not exists transactions (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  amount      numeric(8,2) not null,
  reason      text not null,
  week_start  date not null,
  created_at  timestamptz default now()
);

-- Presets table
create table if not exists presets (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  label       text not null,
  amount      numeric(8,2) not null,
  type        text not null check (type in ('deduct', 'bonus')),
  created_at  timestamptz default now()
);

-- Settings table (stores per-kid allowances and any future config)
create table if not exists settings (
  key         text primary key,
  value       text not null,
  updated_at  timestamptz default now()
);

-- Seed default allowances
insert into settings (key, value) values
  ('allowance_Noah',  '40'),
  ('allowance_Jonah', '40'),
  ('allowance_Leah',  '40')
on conflict (key) do nothing;

-- Row Level Security
alter table transactions enable row level security;
alter table presets      enable row level security;
alter table settings     enable row level security;

create policy "Allow all" on transactions for all using (true) with check (true);
create policy "Allow all" on presets      for all using (true) with check (true);
create policy "Allow all" on settings     for all using (true) with check (true);
