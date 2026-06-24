-- Run in Supabase SQL Editor

-- Add tally chore type and weekly_target to chores
alter table chores drop constraint if exists chores_chore_type_check;
alter table chores add constraint chores_chore_type_check
  check (chore_type in ('daily', 'weekly', 'tally'));
alter table chores add column if not exists weekly_target int default null;

-- Add count column to chore_completions for tally chores
alter table chore_completions add column if not exists count int default null;

-- Add note column to transactions
alter table transactions add column if not exists note text default null;

-- Streaks table
create table if not exists streaks (
  id          bigint generated always as identity primary key,
  kid         text not null check (kid in ('Noah', 'Jonah', 'Leah')),
  week_start  date not null,
  completed   boolean not null default false,
  created_at  timestamptz default now(),
  unique (kid, week_start)
);

alter table streaks enable row level security;
create policy "Allow all" on streaks for all using (true) with check (true);

-- Enable realtime for streaks
alter publication supabase_realtime add table streaks;
