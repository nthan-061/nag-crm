-- Migration 009: scheduled messages, quick replies, and operational events.
-- Run this in the Supabase SQL Editor.

create table if not exists public.scheduled_messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  content text not null,
  scheduled_for timestamptz not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  last_error text,
  sent_at timestamptz,
  external_id text,
  message_id uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint scheduled_messages_content_check check (length(trim(content)) > 0),
  constraint scheduled_messages_attempts_check check (attempts >= 0),
  constraint scheduled_messages_status_check check (status in ('pending', 'processing', 'sent', 'failed', 'canceled'))
);

create index if not exists idx_scheduled_messages_status_due
on public.scheduled_messages(status, scheduled_for);

create index if not exists idx_scheduled_messages_lead_due
on public.scheduled_messages(lead_id, scheduled_for desc);

create unique index if not exists idx_scheduled_messages_message_id_once
on public.scheduled_messages(message_id)
where message_id is not null;

create table if not exists public.message_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),

  constraint message_templates_title_check check (length(trim(title)) > 0),
  constraint message_templates_content_check check (length(trim(content)) > 0)
);

create index if not exists idx_message_templates_active
on public.message_templates(is_active);

create index if not exists idx_message_templates_title
on public.message_templates(title);

create table if not exists public.crm_events (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete set null,
  event_type text not null,
  source text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),

  constraint crm_events_event_type_check check (length(trim(event_type)) > 0),
  constraint crm_events_source_check check (length(trim(source)) > 0)
);

create index if not exists idx_crm_events_lead_created
on public.crm_events(lead_id, created_at desc);

create index if not exists idx_crm_events_type_created
on public.crm_events(event_type, created_at desc);

create index if not exists idx_crm_events_source_created
on public.crm_events(source, created_at desc);

drop trigger if exists set_scheduled_messages_updated_at on public.scheduled_messages;
create trigger set_scheduled_messages_updated_at
before update on public.scheduled_messages
for each row
execute function public.set_updated_at();

drop trigger if exists set_message_templates_updated_at on public.message_templates;
create trigger set_message_templates_updated_at
before update on public.message_templates
for each row
execute function public.set_updated_at();

alter table public.scheduled_messages enable row level security;
alter table public.message_templates enable row level security;
alter table public.crm_events enable row level security;

drop policy if exists "authenticated_read_scheduled_messages" on public.scheduled_messages;
create policy "authenticated_read_scheduled_messages" on public.scheduled_messages for select to authenticated using (true);
drop policy if exists "authenticated_write_scheduled_messages" on public.scheduled_messages;
create policy "authenticated_write_scheduled_messages" on public.scheduled_messages for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_read_message_templates" on public.message_templates;
create policy "authenticated_read_message_templates" on public.message_templates for select to authenticated using (true);
drop policy if exists "authenticated_write_message_templates" on public.message_templates;
create policy "authenticated_write_message_templates" on public.message_templates for all to authenticated using (true) with check (true);

drop policy if exists "authenticated_read_crm_events" on public.crm_events;
create policy "authenticated_read_crm_events" on public.crm_events for select to authenticated using (true);
drop policy if exists "authenticated_write_crm_events" on public.crm_events;
create policy "authenticated_write_crm_events" on public.crm_events for all to authenticated using (true) with check (true);

insert into public.message_templates (title, content)
values
  ('Primeiro atendimento', 'Ola, tudo bem? Posso te ajudar com sua cotacao?'),
  ('Opcoes em breve', 'Consegui algumas opcoes e vou te enviar em instantes.'),
  ('Follow-up', 'Passando para saber se conseguiu avaliar as opcoes.'),
  ('Ajuste de viagem', 'Fico a disposicao para ajustar datas, destino ou orcamento.')
on conflict do nothing;
