-- Run in Supabase SQL Editor if you already have `render_jobs` but see:
-- "Could not find the 'progress' column of 'render_jobs' in the schema cache"
-- Safe to run multiple times (IF NOT EXISTS).

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

-- PostgREST picks up new columns within about a minute. Retry Generate Video if needed.
