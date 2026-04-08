-- Migration: soft-delete for leads
-- Run this in the Supabase SQL Editor before deploying the new code.

-- 1. Add deleted_at column to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Update kanban view to exclude soft-deleted leads
CREATE OR REPLACE VIEW public.kanban_cards_view AS
SELECT
  c.id AS card_id,
  c.coluna_id,
  c.prioridade,
  c.responsavel,
  c.ultima_interacao,
  c.criado_em,
  l.id AS lead_id,
  l.nome AS lead_nome,
  l.telefone AS lead_telefone,
  l.origem AS lead_origem,
  (
    SELECT m.conteudo
    FROM public.messages m
    WHERE m.lead_id = l.id
      AND m.conteudo NOT LIKE '[[NOTE]]%'
    ORDER BY m.timestamp DESC
    LIMIT 1
  ) AS ultima_mensagem
FROM public.cards c
INNER JOIN public.leads l ON l.id = c.lead_id
WHERE l.deleted_at IS NULL;
