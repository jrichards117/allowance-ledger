-- Run in Supabase SQL Editor

create table if not exists bonus_requests (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  preset_id   bigint references presets(id) on delete set null,
  label       text not null,
  amount      numeric(8,2) not null,
  week_start  date not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'denied')),
  created_at  timestamptz default now()
);

alter table bonus_requests enable row level security;
create policy "Allow all" on bonus_requests for all using (true) with check (true);
