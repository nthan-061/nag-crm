import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeLeadNote, encodeLeadNote, isLeadNote } from "@/lib/notes";
import type { LeadNote, Message } from "@/lib/types/database";

export async function listMessagesByLead(leadId: string): Promise<Message[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []).filter((message) => !isLeadNote(message.conteudo));
}

export async function createMessage(input: {
  lead_id: string;
  conteudo: string;
  tipo: "entrada" | "saida";
  timestamp?: string;
  external_id?: string;
}): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();

  // Quando há external_id, usa upsert para garantir idempotência (retry da Evolution)
  if (input.external_id) {
    const { data, error } = await supabase
      .from("messages")
      .upsert(input, { onConflict: "external_id", ignoreDuplicates: true })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Sem external_id (mensagens enviadas pelo CRM): insert simples
  const { data, error } = await supabase
    .from("messages")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function listNotesByLead(leadId: string): Promise<LeadNote[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .filter((message) => isLeadNote(message.conteudo))
    .map((message) => ({
      id: message.id,
      lead_id: message.lead_id,
      conteudo: decodeLeadNote(message.conteudo),
      timestamp: message.timestamp
    }));
}

export async function createLeadNote(input: { lead_id: string; conteudo: string }): Promise<LeadNote> {
  const note = await createMessage({
    lead_id: input.lead_id,
    conteudo: encodeLeadNote(input.conteudo),
    tipo: "saida",
    timestamp: new Date().toISOString()
  });

  if (!note) throw new Error("Falha ao criar nota");

  return {
    id: note.id,
    lead_id: note.lead_id,
    conteudo: input.conteudo,
    timestamp: note.timestamp
  };
}

export async function deleteLeadNote(noteId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("messages").delete().eq("id", noteId);
  if (error) throw error;
}
