import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import type { Column } from "@/lib/types/database";

export async function listColumns(): Promise<Column[]> {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();
  const { data, error } = await supabase
    .from("columns")
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("ordem");

  if (error) throw error;
  return data ?? [];
}

export async function createColumn(input: { nome: string; cor?: string | null }): Promise<Column> {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();
  const columns = await listColumns();
  const nextOrder = columns.length + 1;

  const { data, error } = await supabase
    .from("columns")
    .insert({
      pipeline_id: pipelineId,
      nome: input.nome,
      cor: input.cor ?? "#3B82F6",
      ordem: nextOrder
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateColumn(
  columnId: string,
  input: { nome?: string; cor?: string | null; ordem?: number }
): Promise<Column> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("columns")
    .update(input)
    .eq("id", columnId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deleteColumn(columnId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await supabase
    .from("cards")
    .select("*", { count: "exact", head: true })
    .eq("coluna_id", columnId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Nao e possivel remover uma coluna com cards ativos");
  }

  const { error } = await supabase.from("columns").delete().eq("id", columnId);
  if (error) throw error;

  // Normalize remaining orders sequentially (ascending) to avoid
  // hitting the unique(pipeline_id, ordem) constraint that concurrent
  // parallel updates would violate.
  const remaining = await listColumns();
  for (let i = 0; i < remaining.length; i++) {
    await updateColumn(remaining[i].id, { ordem: i + 1 });
  }
}

// Reorders all columns for the pipeline using a two-phase update to avoid
// the unique(pipeline_id, ordem) constraint during the swap.
// Phase 1: shift all orders to a high offset (no conflicts with each other).
// Phase 2: set each column to its final sequential position.
export async function reorderColumns(orderedIds: string[]): Promise<void> {
  const OFFSET = 1_000_000;

  // Phase 1: shift to uncontested high values
  for (let i = 0; i < orderedIds.length; i++) {
    await updateColumn(orderedIds[i], { ordem: OFFSET + i + 1 });
  }

  // Phase 2: set correct 1-based sequential order
  for (let i = 0; i < orderedIds.length; i++) {
    await updateColumn(orderedIds[i], { ordem: i + 1 });
  }
}
