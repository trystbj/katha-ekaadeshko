-- =============================================================================
-- FULL SYNC: public.render_jobs (Supabase SQL Editor — paste all, Run once)
-- =============================================================================
-- Fixes missing columns (video_url, progress, stage, payload, …) and adds
-- the updated_at trigger used by the app and worker.
--
-- Steps:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this ENTIRE file → Run
--   3. Wait ~60 seconds (PostgREST schema cache), then retry Generate Video / worker
--
-- Safe to run multiple times.
-- =============================================================================

create extension if not exists pgcrypto;

-- Shared trigger helper (also used by projects / jobs in schema.sql)
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Base table (no-op if you already have render_jobs from an older migration)
create table if not exists public.render_jobs (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'queued',
  progress int not null default 0,
  stage text not null default '',
  payload jsonb not null default '{}'::jsonb,
  worker_id text,
  video_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill any column missing on an existing table (idempotent)
alter table public.render_jobs add column if not exists status text not null default 'queued';
alter table public.render_jobs add column if not exists progress int not null default 0;
alter table public.render_jobs add column if not exists stage text not null default '';
alter table public.render_jobs add column if not exists payload jsonb not null default '{}'::jsonb;
alter table public.render_jobs add column if not exists worker_id text;
alter table public.render_jobs add column if not exists video_url text;
alter table public.render_jobs add column if not exists error text;
alter table public.render_jobs add column if not exists created_at timestamptz not null default now();
alter table public.render_jobs add column if not exists updated_at timestamptz not null default now();

create index if not exists render_jobs_status_created_idx
  on public.render_jobs (status, created_at asc);

drop trigger if exists render_jobs_set_updated_at on public.render_jobs;
create trigger render_jobs_set_updated_at
before update on public.render_jobs
for each row execute function public.set_updated_at();
