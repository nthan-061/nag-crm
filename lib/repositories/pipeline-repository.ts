import { cache } from "react";
import { DEFAULT_PIPELINE_NAME } from "@/lib/constants";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const ensureDefaultPipeline = cache(async () => {
  const supabase = createSupabaseAdminClient();
  const { data: pipeline } = await (supabase
    .from("pipelines") as any)
    .select("*")
    .eq("nome", DEFAULT_PIPELINE_NAME)
    .maybeSingle();

  let pipelineId = (pipeline as { id: string } | null)?.id;

  if (!pipelineId) {
    const { data: createdPipeline, error } = await (supabase
      .from("pipelines") as any)
      .insert({ nome: DEFAULT_PIPELINE_NAME })
      .select("*")
      .single();

    if (error || !createdPipeline) throw error ?? new Error("Falha ao criar pipeline");
    pipelineId = (createdPipeline as { id: string }).id;
  }

  const { data: columns } = await (supabase
    .from("columns") as any)
    .select("*")
    .eq("pipeline_id", pipelineId)
    .order("ordem");

  if (!columns || columns.length === 0) {
    const { error } = await (supabase.from("columns") as any).insert([
      { pipeline_id: pipelineId, nome: "Entrada de Lead", ordem: 1, cor: "#3B82F6" },
      { pipeline_id: pipelineId, nome: "Qualificação", ordem: 2, cor: "#0EA5E9" },
      { pipeline_id: pipelineId, nome: "Proposta", ordem: 3, cor: "#F59E0B" },
      { pipeline_id: pipelineId, nome: "Fechamento", ordem: 4, cor: "#10B981" }
    ]);

    if (error) throw error;
  }

  return pipelineId;
});
