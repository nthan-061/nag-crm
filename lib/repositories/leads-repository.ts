import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types/database";

export async function listLeads() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("leads") as any).select("*").order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Lead[];
}

export async function findLeadByPhone(telefone: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("leads") as any).select("*").eq("telefone", telefone).maybeSingle();
  if (error) throw error;
  return (data ?? null) as Lead | null;
}

export async function createLead(input: { nome: string; telefone: string; origem?: string | null }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("leads") as any).insert(input).select("*").single();
  if (error) throw error;
  return data as Lead;
}

export async function deleteLead(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("leads") as any).delete().eq("id", leadId).select("id").maybeSingle();
  if (error) throw error;
  return data as Pick<Lead, "id"> | null;
}
