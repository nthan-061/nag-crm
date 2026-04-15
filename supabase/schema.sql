create extension if not exists "pgcrypto";

create table if not exists public.pipelines (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.columns (
  id uuid primary key default gen_random_uuid(),
  pipeline_id uuid not null references public.pipelines(id) on delete cascade,
  nome text not null,
  ordem integer not null,
  cor text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (pipeline_id, nome),
  unique (pipeline_id, ordem)
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null unique,
  origem text,
  criado_em timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null unique references public.leads(id) on delete cascade,
  coluna_id uuid not null references public.columns(id) on delete restrict,
  prioridade text not null default 'media' check (prioridade in ('baixa', 'media', 'alta')),
  responsavel text,
  ultima_interacao timestamptz,
  criado_em timestamptz not null default timezone('utc', now())
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  conteudo text not null,
  tipo text not null check (tipo in ('entrada', 'saida')),
  timestamp timestamptz not null default timezone('utc', now()),
  external_id text,
  media_type text not null default 'text',
  media_mime_type text,
  media_file_name text,
  media_url text,
  media_storage_path text,
  media_size bigint,
  media_duration_seconds integer,
  media_thumbnail text,
  media_metadata jsonb not null default '{}'::jsonb,
  constraint messages_media_type_check check (media_type in ('text', 'image', 'audio', 'video', 'document', 'sticker', 'contact', 'location', 'unknown'))
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  de_coluna uuid references public.columns(id) on delete set null,
  para_coluna uuid not null references public.columns(id) on delete restrict,
  timestamp timestamptz not null default timezone('utc', now())
);

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

create index if not exists idx_leads_telefone on public.leads (telefone);
create index if not exists idx_cards_coluna_id on public.cards (coluna_id);
create index if not exists idx_messages_lead_id_timestamp on public.messages (lead_id, "timestamp" desc);
create index if not exists idx_movements_card_id on public.movements (card_id, "timestamp" desc);
create unique index if not exists idx_messages_external_id on public.messages (external_id) where external_id is not null;
create index if not exists idx_messages_media_type on public.messages(media_type);
create index if not exists idx_messages_media_storage_path on public.messages(media_storage_path) where media_storage_path is not null;
create index if not exists idx_activities_status_position on public.activities(status, position);
create index if not exists idx_activities_lead_id on public.activities(lead_id);
create index if not exists idx_activities_due_date on public.activities(due_date);
create index if not exists idx_scheduled_messages_status_due on public.scheduled_messages(status, scheduled_for);
create index if not exists idx_scheduled_messages_lead_due on public.scheduled_messages(lead_id, scheduled_for desc);
create unique index if not exists idx_scheduled_messages_message_id_once on public.scheduled_messages(message_id) where message_id is not null;
create index if not exists idx_message_templates_active on public.message_templates(is_active);
create index if not exists idx_message_templates_title on public.message_templates(title);
create index if not exists idx_crm_events_lead_created on public.crm_events(lead_id, created_at desc);
create index if not exists idx_crm_events_type_created on public.crm_events(event_type, created_at desc);
create index if not exists idx_crm_events_source_created on public.crm_events(source, created_at desc);

create or replace view public.kanban_cards_view as
select
  c.id as card_id,
  c.coluna_id,
  c.prioridade,
  c.responsavel,
  c.ultima_interacao,
  c.criado_em,
  l.id as lead_id,
  l.nome as lead_nome,
  l.telefone as lead_telefone,
  l.origem as lead_origem,
  (
    select m.conteudo
    from public.messages m
    where m.lead_id = l.id
      and m.conteudo not like '[[NOTE]]%'
    order by m.timestamp desc
    limit 1
  ) as ultima_mensagem
from public.cards c
inner join public.leads l on l.id = c.lead_id;

create or replace function public.move_card(
  p_card_id uuid,
  p_from_column uuid,
  p_to_column uuid
) returns void
language plpgsql
security definer
as $$
begin
  update public.cards
    set coluna_id = p_to_column, ultima_interacao = now()
    where id = p_card_id;

  insert into public.movements (card_id, de_coluna, para_coluna)
    values (p_card_id, p_from_column, p_to_column);
end;
$$;

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

alter table public.pipelines enable row level security;
alter table public.columns enable row level security;
alter table public.leads enable row level security;
alter table public.cards enable row level security;
alter table public.messages enable row level security;
alter table public.movements enable row level security;
alter table public.activities enable row level security;
alter table public.scheduled_messages enable row level security;
alter table public.message_templates enable row level security;
alter table public.crm_events enable row level security;

create policy "authenticated_read_pipelines" on public.pipelines for select to authenticated using (true);
create policy "authenticated_read_columns" on public.columns for select to authenticated using (true);
create policy "authenticated_read_leads" on public.leads for select to authenticated using (true);
create policy "authenticated_read_cards" on public.cards for select to authenticated using (true);
create policy "authenticated_read_messages" on public.messages for select to authenticated using (true);
create policy "authenticated_read_movements" on public.movements for select to authenticated using (true);
create policy "authenticated_read_activities" on public.activities for select to authenticated using (true);
create policy "authenticated_read_scheduled_messages" on public.scheduled_messages for select to authenticated using (true);
create policy "authenticated_read_message_templates" on public.message_templates for select to authenticated using (true);
create policy "authenticated_read_crm_events" on public.crm_events for select to authenticated using (true);
create policy "authenticated_write_leads" on public.leads for all to authenticated using (true) with check (true);
create policy "authenticated_write_cards" on public.cards for all to authenticated using (true) with check (true);
create policy "authenticated_write_messages" on public.messages for all to authenticated using (true) with check (true);
create policy "authenticated_write_movements" on public.movements for all to authenticated using (true) with check (true);
create policy "authenticated_write_columns" on public.columns for all to authenticated using (true) with check (true);
create policy "authenticated_write_pipelines" on public.pipelines for all to authenticated using (true) with check (true);
create policy "authenticated_write_activities" on public.activities for all to authenticated using (true) with check (true);
create policy "authenticated_write_scheduled_messages" on public.scheduled_messages for all to authenticated using (true) with check (true);
create policy "authenticated_write_message_templates" on public.message_templates for all to authenticated using (true) with check (true);
create policy "authenticated_write_crm_events" on public.crm_events for all to authenticated using (true) with check (true);

insert into public.message_templates (title, content)
values
  ('Primeiro atendimento', 'Ola, tudo bem? Posso te ajudar com sua cotacao?'),
  ('Opcoes em breve', 'Consegui algumas opcoes e vou te enviar em instantes.'),
  ('Follow-up', 'Passando para saber se conseguiu avaliar as opcoes.'),
  ('Ajuste de viagem', 'Fico a disposicao para ajustar datas, destino ou orcamento.')
on conflict do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-media',
  'message-media',
  false,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'audio/ogg',
    'audio/mpeg',
    'audio/mp4',
    'audio/aac',
    'audio/webm',
    'video/mp4',
    'video/quicktime',
    'video/3gpp',
    'video/webm',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into public.pipelines (nome)
values ('Pipeline Comercial')
on conflict (nome) do nothing;

with pipeline as (
  select id from public.pipelines where nome = 'Pipeline Comercial' limit 1
)
insert into public.columns (pipeline_id, nome, ordem, cor)
select pipeline.id, data.nome, data.ordem, data.cor
from pipeline,
(
  values
    ('Entrada de Lead', 1, '#3B82F6'),
    ('Qualificação', 2, '#0EA5E9'),
    ('Proposta', 3, '#F59E0B'),
    ('Fechamento', 4, '#10B981')
) as data(nome, ordem, cor)
on conflict (pipeline_id, nome) do nothing;
