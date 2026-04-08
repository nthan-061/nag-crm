import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Lead } from "@/lib/types/database";

export async function listLeads(): Promise<Lead[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .is("deleted_at", null)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Returns the lead regardless of deleted_at so callers can detect soft-deleted leads.
export async function findLeadByPhone(telefone: string): Promise<Lead | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .eq("telefone", telefone)
    .order("deleted_at", { ascending: true, nullsFirst: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createLead(input: { nome: string; telefone: string; origem?: string | null }): Promise<Lead> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("leads").insert(input).select("*").single();
  if (error) throw error;
  return data;
}

// Soft-delete: sets deleted_at so the row stays in DB.
// Cards and messages remain but are invisible (view filters deleted leads).
export async function deleteLead(leadId: string): Promise<Pick<Lead, "id"> | null> {
  const supabase = createSupabaseAdminClient();

  // Only delete if not already soft-deleted
  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("id", leadId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!existing) return null;

  const { data, error } = await supabase
    .from("leads")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", leadId)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data;
}
