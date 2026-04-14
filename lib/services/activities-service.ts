import {
  createActivity as createActivityRecord,
  deleteActivity as deleteActivityRecord,
  getActivityById,
  getNextActivityPosition,
  isActivitiesTableMissing,
  listActivities,
  listActivityLeads,
  moveActivity as moveActivityRecord,
  reorderActivities,
  updateActivity as updateActivityRecord
} from "@/lib/repositories/activities-repository";
import type { ActivitiesBoardData, ActivityStatus, ActivityWithLead } from "@/lib/types/database";
import {
  createActivitySchema,
  deleteActivitySchema,
  moveActivitySchema,
  updateActivitySchema
} from "@/lib/validations/activities";

export const ACTIVITY_COLUMNS: Array<{ id: ActivityStatus; title: string }> = [
  { id: "todo", title: "A fazer" },
  { id: "doing", title: "Fazendo" },
  { id: "done", title: "Concluido" }
];

function buildBoard(activities: ActivityWithLead[], leads: ActivitiesBoardData["leads"]): ActivitiesBoardData {
  return {
    columns: ACTIVITY_COLUMNS.map((column) => ({
      ...column,
      activities: activities.filter((activity) => activity.status === column.id)
    })),
    leads
  };
}

export async function getActivitiesBoard(): Promise<ActivitiesBoardData> {
  try {
    const [activities, leads] = await Promise.all([listActivities(), listActivityLeads()]);
    return buildBoard(activities, leads);
  } catch (error) {
    if (isActivitiesTableMissing(error)) {
      console.error("Activities table is missing. Apply supabase/migrations/005_create_activities.sql.");
      const leads = await listActivityLeads().catch(() => []);
      return buildBoard([], leads);
    }

    throw error;
  }
}

export async function createActivity(input: unknown) {
  const parsed = createActivitySchema.parse(input);
  const position = await getNextActivityPosition(parsed.status);

  return createActivityRecord({
    title: parsed.title,
    description: parsed.description ?? null,
    status: parsed.status,
    priority: parsed.priority,
    due_date: parsed.due_date ?? null,
    lead_id: parsed.lead_id ?? null,
    position
  });
}

export async function updateActivity(activityId: string, input: unknown) {
  const parsedId = deleteActivitySchema.parse({ activityId });
  const parsed = updateActivitySchema.parse(input);

  return updateActivityRecord(parsedId.activityId, {
    ...parsed,
    description: parsed.description === undefined ? undefined : parsed.description ?? null,
    due_date: parsed.due_date === undefined ? undefined : parsed.due_date ?? null,
    lead_id: parsed.lead_id === undefined ? undefined : parsed.lead_id ?? null
  });
}

export async function deleteActivity(activityId: string) {
  const parsed = deleteActivitySchema.parse({ activityId });
  const existing = await getActivityById(parsed.activityId);
  await deleteActivityRecord(parsed.activityId);

  if (!existing) return;

  const activities = await listActivities();
  const orderedIds = activities
    .filter((activity) => activity.status === existing.status)
    .map((activity) => activity.id);

  await reorderActivities(existing.status, orderedIds);
}

export async function moveActivity(input: unknown) {
  const parsed = moveActivitySchema.parse(input);

  if (parsed.sourceStatus && parsed.sourceStatus !== parsed.status && parsed.sourceOrderedIds) {
    await reorderActivities(parsed.sourceStatus, parsed.sourceOrderedIds);
  }

  if (parsed.targetOrderedIds) {
    await reorderActivities(parsed.status, parsed.targetOrderedIds);
    return;
  }

  await moveActivityRecord(parsed.activityId, parsed.status, parsed.position);
}
