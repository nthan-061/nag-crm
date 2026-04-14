import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  Activity,
  ActivityCreatePayload,
  ActivityLead,
  ActivityStatus,
  ActivityUpdatePayload,
  ActivityWithLead
} from "@/lib/types/database";

type ActivityRow = Activity;

function isMissingActivitiesTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as { code?: string; message?: string };
  return maybeError.code === "42P01" || maybeError.message?.includes("activities") === true;
}

function attachLeads(activities: ActivityRow[], leads: ActivityLead[]): ActivityWithLead[] {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));

  return activities.map((activity) => ({
    ...activity,
    lead: activity.lead_id ? leadById.get(activity.lead_id) ?? null : null
  }));
}

export async function listActivityLeads(): Promise<ActivityLead[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("id, nome, telefone, origem")
    .is("deleted_at", null)
    .order("nome", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function listActivities(): Promise<ActivityWithLead[]> {
  const supabase = createSupabaseAdminClient();
  const [{ data: activities, error: activitiesError }, leads] = await Promise.all([
    supabase
      .from("activities")
      .select("*")
      .order("status", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    listActivityLeads()
  ]);

  if (activitiesError) throw activitiesError;
  return attachLeads(activities ?? [], leads);
}

export function isActivitiesTableMissing(error: unknown) {
  return isMissingActivitiesTableError(error);
}

export async function getActivityById(activityId: string): Promise<Activity | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.from("activities").select("*").eq("id", activityId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getNextActivityPosition(status: ActivityStatus): Promise<number> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("activities")
    .select("position")
    .eq("status", status)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return typeof data?.position === "number" ? data.position + 1 : 0;
}

export async function createActivity(data: ActivityCreatePayload): Promise<Activity> {
  const supabase = createSupabaseAdminClient();
  const { data: activity, error } = await supabase.from("activities").insert(data).select("*").single();
  if (error) throw error;
  return activity;
}

export async function updateActivity(activityId: string, data: ActivityUpdatePayload): Promise<Activity> {
  const supabase = createSupabaseAdminClient();
  const { data: activity, error } = await supabase
    .from("activities")
    .update(data)
    .eq("id", activityId)
    .select("*")
    .single();

  if (error) throw error;
  return activity;
}

export async function deleteActivity(activityId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throw error;
}

export async function moveActivity(activityId: string, status: ActivityStatus, position: number): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("activities").update({ status, position }).eq("id", activityId);
  if (error) throw error;
}

export async function reorderActivities(status: ActivityStatus, orderedIds: string[]): Promise<void> {
  if (!orderedIds.length) return;

  const supabase = createSupabaseAdminClient();
  const results = await Promise.all(
    orderedIds.map((id, position) => supabase.from("activities").update({ status, position }).eq("id", id))
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}
