-- Enable Realtime for the three tables that need live updates
-- Run in Supabase SQL Editor

alter publication supabase_realtime add table transactions;
alter publication supabase_realtime add table bonus_requests;
alter publication supabase_realtime add table chore_completions;
