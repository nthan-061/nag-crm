import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import type { Column } from "@/lib/types/database";

export async function listColumns() {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();
  const { data, error } = await (supabase.from("columns") as any)
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("ordem");

  if (error) throw error;
  return (data ?? []) as Column[];
}

export async function createColumn(input: { nome: string; cor?: string | null }) {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();
  const columns = await listColumns();
  const nextOrder = columns.length + 1;

  const { data, error } = await (supabase.from("columns") as any)
    .insert({
      pipeline_id: pipelineId,
      nome: input.nome,
      cor: input.cor ?? "#3B82F6",
      ordem: nextOrder
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as Column;
}

export async function updateColumn(
  columnId: string,
  input: { nome?: string; cor?: string | null; ordem?: number }
) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await (supabase.from("columns") as any)
    .update(input)
    .eq("id", columnId)
    .select("*")
    .single();

  if (error) throw error;
  return data as Column;
}

export async function deleteColumn(columnId: string) {
  const supabase = createSupabaseAdminClient();
  const { count, error: countError } = await (supabase.from("cards") as any)
    .select("*", { count: "exact", head: true })
    .eq("coluna_id", columnId);

  if (countError) throw countError;
  if ((count ?? 0) > 0) {
    throw new Error("Nao e possivel remover uma coluna com cards ativos");
  }

  const { error } = await (supabase.from("columns") as any).delete().eq("id", columnId);
  if (error) throw error;

  const columns = await listColumns();
  await Promise.all(
    columns.map((column, index) =>
      updateColumn(column.id, {
        ordem: index + 1
      })
    )
  );
}
