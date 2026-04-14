import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeLeadNote, encodeLeadNote, isLeadNote } from "@/lib/notes";
import type { LeadNote, Message, MessageMediaType } from "@/lib/types/database";

export type MessageMediaInput = {
  media_type?: MessageMediaType;
  media_mime_type?: string | null;
  media_file_name?: string | null;
  media_url?: string | null;
  media_storage_path?: string | null;
  media_size?: number | null;
  media_duration_seconds?: number | null;
  media_thumbnail?: string | null;
  media_metadata?: Record<string, unknown>;
};

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
} & MessageMediaInput): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();
  const payload = {
    ...input,
    media_type: input.media_type ?? "text",
    media_metadata: input.media_metadata ?? {}
  };

  // Quando há external_id, usa upsert para garantir idempotência (retry da Evolution)
  if (input.external_id) {
    const { data, error } = await supabase
      .from("messages")
      .upsert(payload, { onConflict: "external_id", ignoreDuplicates: true })
      .select("*")
      .maybeSingle();
    if (error) throw error;
    return data;
  }

  // Sem external_id (mensagens enviadas pelo CRM): insert simples
  const { data, error } = await supabase
    .from("messages")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function findMessageByExternalId(externalId: string): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("external_id", externalId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getMessageById(messageId: string): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("messages").select("*").eq("id", messageId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateMessageMedia(messageId: string, mediaData: MessageMediaInput): Promise<Message> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .update({
      ...mediaData,
      media_metadata: mediaData.media_metadata ?? {}
    })
    .eq("id", messageId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listPendingMediaMessages(limit = 5): Promise<Message[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .in("media_type", ["image", "audio", "video"])
    .is("media_storage_path", null)
    .order("timestamp", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
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
