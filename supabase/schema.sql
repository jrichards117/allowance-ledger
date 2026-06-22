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

-- Enable Row Level Security (open read/write since PIN is handled in the app)
alter table transactions enable row level security;
alter table presets enable row level security;

create policy "Allow all" on transactions for all using (true) with check (true);
create policy "Allow all" on presets for all using (true) with check (true);
