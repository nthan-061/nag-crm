import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types/database";

export async function listLeads(): Promise<Lead[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, origem, criado_em, deleted_at, cards!inner(id)")
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(({ cards: _cards, ...lead }) => lead as Lead);
}

export async function findLeadByPhone(telefone: string): Promise<Lead | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("telefone", telefone)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLead(input: { nome: string; telefone: string; origem?: string | null }): Promise<Lead> {
  const supabase = createSupabaseAdminClient();
  const { data: existing } = await supabase
    .from("leads")
    .select("*")
    .eq("telefone", input.telefone)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("leads")
      .update({
        nome: input.nome,
        origem: input.origem ?? existing.origem,
        deleted_at: null
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase.from("leads").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Hard-delete: removes the row permanently. Cards and messages cascade via FK.
// A new lead can be recreated for the same phone if a new message arrives.
export async function deleteLead(leadId: string): Promise<Pick<Lead, "id"> | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  return data;
}
