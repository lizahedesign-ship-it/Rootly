-- =============================================================
-- Rootly — 002_add_push_token.sql
-- Slice 13: Notifications
-- Run via: Supabase Dashboard > SQL Editor
-- =============================================================

-- Expo push token for parent — populated client-side after permission grant.
-- Null means parent hasn't granted permission or hasn't opened the app since
-- Slice 13 was deployed. Edge Functions skip sending when null.
alter table public.parent_account
  add column if not exists push_token text;

-- Deduplication sentinel for the Never Miss Twice notification.
-- Stores the date of the second consecutive miss when a notification was sent.
-- Reset (cleared) is implicit: Edge Function checks whether any completion
-- exists after this date; if yes, the miss streak ended and a new notification
-- is allowed.
alter table public.task
  add column if not exists never_miss_notified_at date;
