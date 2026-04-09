-- Migration 004: full cleanup and alignment
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- DIAGNOSTIC (run first to understand the current state)
-- ============================================================
SELECT 'leads_total'          AS check, COUNT(*)::text AS value FROM public.leads
UNION ALL
SELECT 'leads_soft_deleted'   AS check, COUNT(*)::text AS value FROM public.leads WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'leads_active'         AS check, COUNT(*)::text AS value FROM public.leads WHERE deleted_at IS NULL
UNION ALL
SELECT 'cards_total'          AS check, COUNT(*)::text AS value FROM public.cards
UNION ALL
SELECT 'orphaned_cards'       AS check, COUNT(*)::text AS value FROM public.cards WHERE lead_id NOT IN (SELECT id FROM public.leads)
UNION ALL
SELECT 'kanban_view_rows'     AS check, COUNT(*)::text AS value FROM public.kanban_cards_view;

-- ============================================================
-- CLEANUP
-- ============================================================

-- 1. Hard-delete leads stuck in soft-deleted state (cascades cards and messages)
DELETE FROM public.leads WHERE deleted_at IS NOT NULL;

-- 2. Delete orphaned cards (should not exist due to FK, but cleaning up just in case)
DELETE FROM public.cards WHERE lead_id NOT IN (SELECT id FROM public.leads);

-- 3. Recreate kanban_cards_view WITHOUT deleted_at filter.
--    Hard-delete is the only strategy: rows are completely removed, no filter needed.
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

-- ============================================================
-- VERIFY (run after cleanup to confirm)
-- ============================================================
SELECT 'leads_after'          AS check, COUNT(*)::text AS value FROM public.leads
UNION ALL
SELECT 'cards_after'          AS check, COUNT(*)::text AS value FROM public.cards
UNION ALL
SELECT 'kanban_view_after'    AS check, COUNT(*)::text AS value FROM public.kanban_cards_view;
