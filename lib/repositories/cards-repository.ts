import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { KanbanCardRecord } from "@/lib/types/database";

export async function listCards() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("kanban_cards_view") as any).select("*").order("ultima_interacao", {
    ascending: false
  });
  if (error) throw error;
  return (data ?? []) as KanbanCardRecord[];
}

export async function createCard(input: {
  lead_id: string;
  coluna_id: string;
  prioridade?: "baixa" | "media" | "alta";
  responsavel?: string | null;
  ultima_interacao?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("cards") as any).insert(input).select("*").single();
  if (error) throw error;
  return data as {
    id: string;
    lead_id: string;
    coluna_id: string;
    prioridade: "baixa" | "media" | "alta";
    responsavel: string | null;
    ultima_interacao: string | null;
    criado_em: string;
  };
}

export async function updateCardPosition(input: { cardId: string; fromColumnId?: string | null; toColumnId: string }) {
  const supabase = createSupabaseAdminClient();
  const { data: card, error: updateError } = await (supabase
    .from("cards") as any)
    .update({ coluna_id: input.toColumnId, ultima_interacao: new Date().toISOString() })
    .eq("id", input.cardId)
    .select("*")
    .single();

  if (updateError) throw updateError;

  const { error: movementError } = await (supabase.from("movements") as any).insert({
    card_id: input.cardId,
    de_coluna: input.fromColumnId ?? null,
    para_coluna: input.toColumnId
  });

  if (movementError) throw movementError;
  return card as {
    id: string;
    lead_id: string;
    coluna_id: string;
    prioridade: "baixa" | "media" | "alta";
    responsavel: string | null;
    ultima_interacao: string | null;
    criado_em: string;
  };
}

export async function touchCard(cardId: string, timestamp: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase.from("cards") as any)
    .update({ ultima_interacao: timestamp })
    .eq("id", cardId);
  if (error) throw error;
}

export async function getEntryColumnId() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase
    .from("columns") as any)
    .select("id")
    .eq("nome", "Entrada de Lead")
    .order("ordem")
    .limit(1)
    .single();

  if (error) throw error;
  return (data as { id: string }).id;
}
