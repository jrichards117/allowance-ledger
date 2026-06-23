-- Run this in Supabase SQL Editor to add shared chores support

-- Make kid nullable and add shared flag to chores
alter table chores alter column kid drop not null;
alter table chores alter column kid drop default;
alter table chores add column if not exists shared boolean not null default false;

-- Drop the old check constraint on kid (allows null now)
alter table chores drop constraint if exists chores_kid_check;
alter table chores add constraint chores_kid_check
  check (kid in ('Noah', 'Jonah', 'Leah') or kid is null);

-- Make kid nullable in chore_completions too (shared chores don't belong to a kid)
alter table chore_completions alter column kid drop not null;
alter table chore_completions drop constraint if exists chore_completions_kid_check;
alter table chore_completions add constraint chore_completions_kid_check
  check (kid in ('Noah', 'Jonah', 'Leah') or kid is null);
