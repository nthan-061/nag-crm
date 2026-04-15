import type { DashboardData, KanbanCardRecord, Column, Pipeline } from "@/lib/types/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { listCards } from "@/lib/repositories/cards-repository";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import { listScheduledMessagesForDay } from "@/lib/repositories/scheduled-messages-repository";
import { getOperationalMetrics } from "@/lib/services/response-status";

export async function getDashboardSnapshot(): Promise<DashboardData> {
  const supabase = createSupabaseAdminClient();
  const pipelineId = await ensureDefaultPipeline();

  const [{ data: pipelines }, { data: columns }, cards, scheduledToday] = await Promise.all([
    supabase.from("pipelines").select("*").order("created_at"),
    supabase.from("columns").select("*").eq("pipeline_id", pipelineId).order("ordem"),
    listCards(),
    listScheduledMessagesForDay(new Date()).catch((error) => {
      console.warn("[dashboard] scheduled messages unavailable", error instanceof Error ? error.message : String(error));
      return [];
    })
  ]);

  return {
    pipelines: (pipelines ?? []) as Pipeline[],
    columns: (columns ?? []) as Column[],
    cards: (cards ?? []) as KanbanCardRecord[],
    selectedLeadMessages: [],
    metrics: getOperationalMetrics(cards.map((card) => ({
      needsResponse: Boolean(card.needs_response),
      lastMessageType: card.last_message_type ?? null,
      lastMessageAt: card.last_message_at ?? null,
      waitHours: card.response_wait_hours ?? null,
      slaBucket: card.sla_bucket ?? "none"
    }))),
    scheduledToday
  };
}
