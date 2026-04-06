import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Message } from "@/lib/types/database";

export async function listMessagesByLead(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase
    .from("messages") as any)
    .select("*")
    .eq("lead_id", leadId)
    .order("timestamp", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Message[];
}

export async function createMessage(input: {
  lead_id: string;
  conteudo: string;
  tipo: "entrada" | "saida";
  timestamp?: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("messages") as any).insert(input).select("*").single();
  if (error) throw error;
  return data as Message;
}
