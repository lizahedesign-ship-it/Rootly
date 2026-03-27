-- =============================================================
-- Rootly — 001_initial_schema.sql
-- Slice 2: all tables + RLS + indexes
-- Run via: Supabase Dashboard > SQL Editor, or supabase db push
-- =============================================================

-- Extensions
create extension if not exists "uuid-ossp";


-- =============================================================
-- 1. parent_account
--    One row per auth.users entry. Created automatically by
--    the handle_new_user() trigger below.
-- =============================================================
create table public.parent_account (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  auth_provider       text not null default 'email'
                        check (auth_provider in ('email', 'apple', 'google')),
  created_at          timestamptz not null default now(),
  -- Reserved for post-MVP paywall (RevenueCat). Default 'active' means no gate.
  subscription_status text not null default 'active'
                        check (subscription_status in ('active', 'inactive', 'trial'))
);

alter table public.parent_account enable row level security;

create policy "parent_account: select own"
  on public.parent_account for select
  using (auth.uid() = id);

create policy "parent_account: insert own"
  on public.parent_account for insert
  with check (auth.uid() = id);

create policy "parent_account: update own"
  on public.parent_account for update
  using (auth.uid() = id);

-- Auto-create parent_account when a new auth user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.parent_account (id, email, auth_provider)
  values (
    new.id,
    new.email,
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- =============================================================
-- 2. child_profile
--    Up to 4 per parent (enforced in app layer).
--    gender / invite_code / linked_account_id reserved for V2.
-- =============================================================
create table public.child_profile (
  id                uuid primary key default gen_random_uuid(),
  parent_id         uuid not null references public.parent_account(id) on delete cascade,
  name              text not null,
  age               smallint not null check (age between 1 and 17),
  gender            text not null default 'other'
                      check (gender in ('boy', 'girl', 'other')),
  avatar_emoji      text not null default '😊',
  created_at        timestamptz not null default now(),
  -- V2 reserved
  invite_code       text,
  linked_account_id uuid
);

alter table public.child_profile enable row level security;

create policy "child_profile: all for own parent"
  on public.child_profile for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index child_profile_parent_id_idx on public.child_profile(parent_id);


-- =============================================================
-- 3. task
--    parent_id is denormalized from child_profile for direct
--    RLS checks without a join.
--    icon: string (emoji or future image key / URI).
--    custom_days: array of ISO weekday ints (1=Mon … 7=Sun).
-- =============================================================
create table public.task (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid not null references public.child_profile(id) on delete cascade,
  parent_id     uuid not null references public.parent_account(id) on delete cascade,
  name          text not null,
  icon          text not null default '⭐',
  category      text not null
                  check (category in
                    ('learning', 'physical', 'family', 'interests', 'character', 'growth')),
  frequency     text not null default 'daily'
                  check (frequency in ('daily', 'weekdays', 'weekends', 'custom')),
  -- Required when frequency = 'custom'; values 1–7 (ISO weekday)
  custom_days   integer[],
  reminder_time time,
  created_at    timestamptz not null default now(),
  is_active     boolean not null default true,
  is_graduated  boolean not null default false,
  graduated_at  timestamptz,
  -- Guard: custom_days must be set when frequency = 'custom'
  constraint custom_days_required
    check (frequency <> 'custom' or
           (custom_days is not null and array_length(custom_days, 1) > 0))
);

alter table public.task enable row level security;

create policy "task: all for own parent"
  on public.task for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index task_child_id_idx  on public.task(child_id);
create index task_parent_id_idx on public.task(parent_id);
-- Fast lookup of active tasks for child home screen
create index task_active_idx
  on public.task(child_id, is_active)
  where is_active = true and is_graduated = false;


-- =============================================================
-- 4. task_completion
--    One row per (task, calendar date) — unique constraint is
--    the offline-sync idempotency key.
--    parent_id denormalized for direct RLS.
-- =============================================================
create table public.task_completion (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.task(id) on delete cascade,
  child_id     uuid not null references public.child_profile(id) on delete cascade,
  parent_id    uuid not null references public.parent_account(id) on delete cascade,
  completed_at date not null,
  created_at   timestamptz not null default now(),
  -- Idempotency: one completion per task per day (supports offline upsert)
  unique (task_id, completed_at)
);

alter table public.task_completion enable row level security;

create policy "task_completion: all for own parent"
  on public.task_completion for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index task_completion_task_id_idx      on public.task_completion(task_id);
create index task_completion_child_id_idx     on public.task_completion(child_id);
create index task_completion_parent_id_idx    on public.task_completion(parent_id);
-- Range queries for habit health calculation and records tab
create index task_completion_date_idx
  on public.task_completion(child_id, completed_at desc);


-- =============================================================
-- 5. milestone
--    type: streak_7 / streak_30 / count_100
--    Each type fires at most once per task (unique constraint).
--    photo_url / parent_note: added by parent after trigger.
--    parent_id denormalized for direct RLS.
-- =============================================================
create table public.milestone (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.task(id) on delete cascade,
  child_id     uuid not null references public.child_profile(id) on delete cascade,
  parent_id    uuid not null references public.parent_account(id) on delete cascade,
  type         text not null
                 check (type in ('streak_7', 'streak_30', 'count_100')),
  triggered_at timestamptz not null default now(),
  photo_url    text,        -- Supabase Storage signed URL, set when parent adds photo
  parent_note  text,
  created_at   timestamptz not null default now(),
  -- Each milestone type is earned once per task
  unique (task_id, type)
);

alter table public.milestone enable row level security;

create policy "milestone: all for own parent"
  on public.milestone for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index milestone_task_id_idx   on public.milestone(task_id);
create index milestone_child_id_idx  on public.milestone(child_id);
create index milestone_parent_id_idx on public.milestone(parent_id);


-- =============================================================
-- 6. habit_health_snapshot
--    Computed nightly by the calculate-habit-health Edge Function.
--    Multiple rows per task (history); the latest row per task
--    is the current state.
--    graduated tasks stop receiving new snapshots.
--    parent_id denormalized for direct RLS.
-- =============================================================
create table public.habit_health_snapshot (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references public.task(id) on delete cascade,
  parent_id         uuid not null references public.parent_account(id) on delete cascade,
  computed_at       timestamptz not null default now(),
  stage             text not null
                      check (stage in ('sprouting', 'growing', 'rooted', 'blooming')),
  consistency_rate  numeric(5, 2) not null
                      check (consistency_rate between 0 and 100),
  -- null until 3+ miss events have occurred (see PRD §5)
  avg_recovery_days numeric(5, 2),
  trend             text not null
                      check (trend in ('up', 'flat', 'down'))
);

alter table public.habit_health_snapshot enable row level security;

create policy "habit_health_snapshot: all for own parent"
  on public.habit_health_snapshot for all
  using (auth.uid() = parent_id)
  with check (auth.uid() = parent_id);

create index habit_health_snapshot_task_id_idx   on public.habit_health_snapshot(task_id);
create index habit_health_snapshot_parent_id_idx on public.habit_health_snapshot(parent_id);
-- Efficient "latest snapshot per task" queries
create index habit_health_snapshot_latest_idx
  on public.habit_health_snapshot(task_id, computed_at desc);
