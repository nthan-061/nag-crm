-- Migration 005: commercial activities board.
-- Run this in the Supabase SQL Editor.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  status text not null default 'todo',
  priority text not null default 'medium',
  due_date timestamptz,
  lead_id uuid references public.leads(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint activities_status_check check (status in ('todo', 'doing', 'done')),
  constraint activities_priority_check check (priority in ('low', 'medium', 'high')),
  constraint activities_position_check check (position >= 0)
);

create index if not exists idx_activities_status_position
on public.activities(status, position);

create index if not exists idx_activities_lead_id
on public.activities(lead_id);

create index if not exists idx_activities_due_date
on public.activities(due_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_activities_updated_at on public.activities;
create trigger set_activities_updated_at
before update on public.activities
for each row
execute function public.set_updated_at();

alter table public.activities enable row level security;

drop policy if exists "authenticated_read_activities" on public.activities;
create policy "authenticated_read_activities"
on public.activities for select to authenticated using (true);

drop policy if exists "authenticated_write_activities" on public.activities;
create policy "authenticated_write_activities"
on public.activities for all to authenticated using (true) with check (true);
