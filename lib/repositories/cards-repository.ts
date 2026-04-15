import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isLeadNote } from "@/lib/notes";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import type { KanbanCardRecord } from "@/lib/types/database";

export async function listCards(): Promise<KanbanCardRecord[]> {
  const supabase = createSupabaseAdminClient();
  const [{ data: cards, error: cardsError }, { data: leads, error: leadsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase.from("cards").select("*").order("ultima_interacao", { ascending: false }),
      supabase.from("leads").select("*").is("deleted_at", null),
      supabase.from("messages").select("*").order("timestamp", { ascending: false })
    ]);

  if (cardsError) throw cardsError;
  if (leadsError) throw leadsError;
  if (messagesError) throw messagesError;

  const leadById = new Map((leads ?? []).map((lead) => [lead.id, lead]));
  const latestMessageByLeadId = new Map<string, string | null>();

  for (const message of messages ?? []) {
    if (isLeadNote(message.conteudo)) continue;
    if (!latestMessageByLeadId.has(message.lead_id)) {
      latestMessageByLeadId.set(message.lead_id, message.conteudo);
    }
  }

  return (cards ?? [])
    .map((card) => {
      const lead = leadById.get(card.lead_id);
      if (!lead) return null;

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
        ultima_mensagem: latestMessageByLeadId.get(lead.id) ?? null
      } satisfies KanbanCardRecord;
    })
    .filter((card): card is KanbanCardRecord => card !== null);
}

export async function listConversations(): Promise<KanbanCardRecord[]> {
  const supabase = createSupabaseAdminClient();
  const [{ data: leads, error: leadsError }, { data: cards, error: cardsError }, { data: messages, error: messagesError }] =
    await Promise.all([
      supabase.from("leads").select("*").is("deleted_at", null),
      supabase.from("cards").select("*"),
      supabase.from("messages").select("*").order("timestamp", { ascending: false })
    ]);

  if (leadsError) throw leadsError;
  if (cardsError) throw cardsError;
  if (messagesError) throw messagesError;

  const cardByLeadId = new Map((cards ?? []).map((card) => [card.lead_id, card]));
  const latestMessageByLeadId = new Map<string, { conteudo: string; timestamp: string }>();

  for (const message of messages ?? []) {
    if (isLeadNote(message.conteudo)) continue;
    if (!latestMessageByLeadId.has(message.lead_id)) {
      latestMessageByLeadId.set(message.lead_id, {
        conteudo: message.conteudo,
        timestamp: message.timestamp
      });
    }
  }

  return (leads ?? [])
    .map((lead) => {
      const card = cardByLeadId.get(lead.id);
      const latestMessage = latestMessageByLeadId.get(lead.id);

      return {
        card_id: card?.id ?? `lead-${lead.id}`,
        coluna_id: card?.coluna_id ?? "",
        prioridade: card?.prioridade ?? "media",
        responsavel: card?.responsavel ?? null,
        ultima_interacao: card?.ultima_interacao ?? latestMessage?.timestamp ?? lead.criado_em,
        criado_em: card?.criado_em ?? lead.criado_em,
        lead_id: lead.id,
        lead_nome: lead.nome,
        lead_telefone: lead.telefone,
        lead_origem: lead.origem,
        ultima_mensagem: latestMessage?.conteudo ?? null
      } satisfies KanbanCardRecord;
    })
    .sort((a, b) => {
      const aTime = a.ultima_interacao ? new Date(a.ultima_interacao).getTime() : 0;
      const bTime = b.ultima_interacao ? new Date(b.ultima_interacao).getTime() : 0;
      return bTime - aTime;
    });
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

export async function getEntryColumnId(): Promise<string> {
  const supabase = createSupabaseAdminClient();

  // Try to find a column still named "Entrada de Lead" — works for default setups.
  const { data: named, error: namedError } = await supabase
    .from("columns")
    .select("id")
    .eq("nome", "Entrada de Lead")
    .order("ordem")
    .limit(1)
    .maybeSingle();

  if (namedError) throw namedError;
  if (named) return named.id;

  // Fallback: whoever renamed or deleted that column — use the first column
  // by order within the default pipeline so leads are never lost.
  const pipelineId = await ensureDefaultPipeline();
  const { data: first, error: firstError } = await supabase
    .from("columns")
    .select("id")
    .eq("pipeline_id", pipelineId)
    .order("ordem")
    .limit(1)
    .maybeSingle();

  if (firstError) throw firstError;
  if (!first) throw new Error("Nenhuma coluna encontrada no pipeline");
  return first.id;
}
