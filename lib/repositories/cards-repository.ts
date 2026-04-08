import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { KanbanCardRecord } from "@/lib/types/database";

export async function listCards(): Promise<KanbanCardRecord[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("kanban_cards_view")
    .select("*")
    .order("ultima_interacao", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCard(input: {
  lead_id: string;
  coluna_id: string;
  prioridade?: "baixa" | "media" | "alta";
  responsavel?: string | null;
  ultima_interacao?: string | null;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("cards").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

export async function updateCardPosition(input: {
  cardId: string;
  fromColumnId?: string | null;
  toColumnId: string;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.rpc("move_card", {
    p_card_id: input.cardId,
    p_from_column: input.fromColumnId ?? null,
    p_to_column: input.toColumnId
  });
  if (error) throw error;
}

export async function touchCard(cardId: string, timestamp: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("cards").update({ ultima_interacao: timestamp }).eq("id", cardId);
  if (error) throw error;
}

export async function getEntryColumnId() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("columns")
    .select("id")
    .eq("nome", "Entrada de Lead")
    .order("ordem")
    .limit(1)
    .single();

  if (error) throw error;
  return data.id;
}
