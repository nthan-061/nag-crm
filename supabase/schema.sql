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
  external_id text
);

create table if not exists public.movements (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.cards(id) on delete cascade,
  de_coluna uuid references public.columns(id) on delete set null,
  para_coluna uuid not null references public.columns(id) on delete restrict,
  timestamp timestamptz not null default timezone('utc', now())
);

create index if not exists idx_leads_telefone on public.leads (telefone);
create index if not exists idx_cards_coluna_id on public.cards (coluna_id);
create index if not exists idx_messages_lead_id_timestamp on public.messages (lead_id, "timestamp" desc);
create index if not exists idx_movements_card_id on public.movements (card_id, "timestamp" desc);
create unique index if not exists idx_messages_external_id on public.messages (external_id) where external_id is not null;

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
inner join public.leads l on l.id = c.lead_id
where l.deleted_at is null;

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

alter table public.pipelines enable row level security;
alter table public.columns enable row level security;
alter table public.leads enable row level security;
alter table public.cards enable row level security;
alter table public.messages enable row level security;
alter table public.movements enable row level security;

create policy "authenticated_read_pipelines" on public.pipelines for select to authenticated using (true);
create policy "authenticated_read_columns" on public.columns for select to authenticated using (true);
create policy "authenticated_read_leads" on public.leads for select to authenticated using (true);
create policy "authenticated_read_cards" on public.cards for select to authenticated using (true);
create policy "authenticated_read_messages" on public.messages for select to authenticated using (true);
create policy "authenticated_read_movements" on public.movements for select to authenticated using (true);
create policy "authenticated_write_leads" on public.leads for all to authenticated using (true) with check (true);
create policy "authenticated_write_cards" on public.cards for all to authenticated using (true) with check (true);
create policy "authenticated_write_messages" on public.messages for all to authenticated using (true) with check (true);
create policy "authenticated_write_movements" on public.movements for all to authenticated using (true) with check (true);
create policy "authenticated_write_columns" on public.columns for all to authenticated using (true) with check (true);
create policy "authenticated_write_pipelines" on public.pipelines for all to authenticated using (true) with check (true);

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
