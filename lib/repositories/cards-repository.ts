import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { KanbanCardRecord } from "@/lib/types/database";

export async function listCards() {
  const supabase = createSupabaseAdminClient();
  const [{ data: cards, error: cardsError }, { data: leads, error: leadsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      (supabase.from("cards") as any).select("*").order("ultima_interacao", { ascending: false }),
      (supabase.from("leads") as any).select("*"),
      (supabase.from("messages") as any).select("*").order("timestamp", { ascending: false })
    ]);

  if (cardsError) throw cardsError;
  if (leadsError) throw leadsError;
  if (messagesError) throw messagesError;

  const leadById = new Map<string, any>((leads ?? []).map((lead: any) => [lead.id, lead]));
  const latestMessageByLeadId = new Map<string, any>();

  for (const message of messages ?? []) {
    if (!latestMessageByLeadId.has(message.lead_id)) {
      latestMessageByLeadId.set(message.lead_id, message);
    }
  }

  return ((cards ?? []) as any[])
    .map((card) => {
      const lead = leadById.get(card.lead_id);
      if (!lead) return null;
      const latestMessage = latestMessageByLeadId.get(card.lead_id);

      return {
        card_id: card.id,
        coluna_id: card.coluna_id,
        prioridade: card.prioridade,
        responsavel: card.responsavel,
        ultima_interacao: card.ultima_interacao,
        criado_em: card.criado_em,
        lead_id: lead.id,
        lead_nome: lead.nome,
        lead_telefone: lead.telefone,
        lead_origem: lead.origem,
        ultima_mensagem: latestMessage?.conteudo ?? null
      } satisfies KanbanCardRecord;
    })
    .filter(Boolean) as KanbanCardRecord[];
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
