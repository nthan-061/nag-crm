import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decodeLeadNote, encodeLeadNote, isLeadNote } from "@/lib/notes";
import type { LeadNote, Message } from "@/lib/types/database";

export async function listMessagesByLead(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase
    .from("messages") as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Message[]).filter((message) => !isLeadNote(message.conteudo));
}

export async function createMessage(input: {
  lead_id: string;
  conteudo: string;
  tipo: "entrada" | "saida";
  timestamp?: string;
  external_id?: string;
}): Promise<Message | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("messages") as any)
    .upsert(input, { onConflict: "external_id", ignoreDuplicates: true })
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as Message | null;
}

export async function listNotesByLead(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("messages") as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as Message[])
    .filter((message) => isLeadNote(message.conteudo))
    .map(
      (message) =>
        ({
          id: message.id,
          lead_id: message.lead_id,
          conteudo: decodeLeadNote(message.conteudo),
          timestamp: message.timestamp
        }) satisfies LeadNote
    );
}

export async function createLeadNote(input: { lead_id: string; conteudo: string }) {
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
  } satisfies LeadNote;
}

export async function deleteLeadNote(noteId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await (supabase.from("messages") as any).delete().eq("id", noteId);
  if (error) throw error;
}
