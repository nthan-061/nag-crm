import type { DashboardData, KanbanCardRecord, Column, Pipeline } from "@/lib/types/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";

export async function getDashboardSnapshot(): Promise<DashboardData> {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();

  const [{ data: pipelines }, { data: columns }, { data: cards }] = await Promise.all([
    supabase.from("pipelines").select("*").order("created_at"),
    supabase.from("columns").select("*").eq("pipeline_id", pipelineId).order("ordem"),
    supabase.from("kanban_cards_view").select("*").order("ultima_interacao", { ascending: false })
  ]);

  return {
    pipelines: (pipelines ?? []) as Pipeline[],
    columns: (columns ?? []) as Column[],
    cards: (cards ?? []) as KanbanCardRecord[],
    selectedLeadMessages: []
  };
}
