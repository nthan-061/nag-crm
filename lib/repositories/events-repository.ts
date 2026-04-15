import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CrmEvent } from "@/lib/types/database";

function sanitizePayload(payload: Record<string, unknown> = {}) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key, value]) => {
      const lower = key.toLowerCase();
      if (lower.includes("token") || lower.includes("secret") || lower.includes("key") || lower.includes("base64")) {
        return false;
      }
      if (typeof value === "string" && value.length > 1000) return false;
      return true;
    })
  );
}

export async function recordCrmEvent(input: {
  leadId?: string | null;
  eventType: string;
  source: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("crm_events").insert({
    lead_id: input.leadId ?? null,
    event_type: input.eventType,
    source: input.source,
    payload: sanitizePayload(input.payload)
  });

  if (error) {
    console.warn("[crm-events] failed to record event", {
      eventType: input.eventType,
      source: input.source,
      error: error.message
    });
  }
}

export async function listRecentCrmEvents(limit = 20): Promise<CrmEvent[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("crm_events")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}
