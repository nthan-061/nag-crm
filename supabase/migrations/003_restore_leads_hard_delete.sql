-- Migration: restore leads stuck in soft-delete state and align view
-- Run this in the Supabase SQL Editor.

-- 1. Restore any leads that were soft-deleted during the brief soft-delete period.
--    With hard-delete as the only strategy, deleted_at is never set in code.
--    Nulling it out makes all existing rows visible again.
UPDATE public.leads SET deleted_at = NULL WHERE deleted_at IS NOT NULL;

-- 2. Recreate kanban_cards_view WITHOUT the deleted_at filter.
--    Hard-delete removes rows entirely, so the filter is redundant and was
--    causing pipeline/dashboard to diverge from the leads table.
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
INNER JOIN public.leads l ON l.id = c.lead_id;
