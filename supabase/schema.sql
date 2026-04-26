-- Katha Ekadeshko: Supabase schema + RLS
-- Run this in Supabase SQL Editor (in your project).

create extension if not exists pgcrypto;

-- Projects: full serialized project state (jsonb) owned by a user
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Untitled Story',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  project_json jsonb not null default '{}'::jsonb
);

create index if not exists projects_owner_id_idx on public.projects (owner_id);
create index if not exists projects_updated_at_idx on public.projects (updated_at desc);

-- Jobs: live monitoring via polling (or realtime later)
create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  type text not null,
  status text not null default 'queued',
  progress int not null default 0,
  stage text not null default '',
  log jsonb not null default '[]'::jsonb,
  result_ref jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists jobs_owner_id_idx on public.jobs (owner_id);
create index if not exists jobs_project_id_idx on public.jobs (project_id);
create index if not exists jobs_updated_at_idx on public.jobs (updated_at desc);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists jobs_set_updated_at on public.jobs;
create trigger jobs_set_updated_at
before update on public.jobs
for each row execute function public.set_updated_at();

-- RLS
alter table public.projects enable row level security;
alter table public.jobs enable row level security;

-- Projects policies
drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
for select using (auth.uid() = owner_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
for insert with check (auth.uid() = owner_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
for delete using (auth.uid() = owner_id);

-- Jobs policies
drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
for select using (auth.uid() = owner_id);

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
for insert with check (auth.uid() = owner_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

