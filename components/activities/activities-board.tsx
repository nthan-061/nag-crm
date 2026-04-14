"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityCard } from "@/components/activities/activity-card";
import { ActivityColumn } from "@/components/activities/activity-column";
import { ActivityDialog } from "@/components/activities/activity-dialog";
import type { ActivityFormValues } from "@/components/activities/activity-form";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { ActivitiesBoardData, ActivityBoardColumn, ActivityStatus, ActivityWithLead } from "@/lib/types/database";

function cloneColumns(columns: ActivityBoardColumn[]): ActivityBoardColumn[] {
  return columns.map((column) => ({
    ...column,
    activities: column.activities.map((activity, position) => ({ ...activity, position }))
  }));
}

function findActivity(columns: ActivityBoardColumn[], activityId: string) {
  for (const column of columns) {
    const index = column.activities.findIndex((activity) => activity.id === activityId);
    if (index >= 0) return { column, index, activity: column.activities[index] };
  }

  return null;
}

function getColumn(columns: ActivityBoardColumn[], status: ActivityStatus) {
  const column = columns.find((item) => item.id === status);
  if (!column) throw new Error("Coluna invalida");
  return column;
}

function orderedIds(column: ActivityBoardColumn) {
  return column.activities.map((activity) => activity.id);
}

export function ActivitiesBoard({ initialBoard }: { initialBoard: ActivitiesBoardData }) {
  const [columns, setColumns] = useState(() => cloneColumns(initialBoard.columns));
  const [leads, setLeads] = useState(initialBoard.leads);
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [editingActivity, setEditingActivity] = useState<ActivityWithLead | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const latestRefreshId = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const allActivities = useMemo(() => columns.flatMap((column) => column.activities), [columns]);
  const activeActivity = allActivities.find((activity) => activity.id === activeActivityId) ?? null;

  async function refreshBoard() {
    const refreshId = ++latestRefreshId.current;

    try {
      const response = await fetch("/api/activities", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { data?: ActivitiesBoardData };
      if (refreshId !== latestRefreshId.current || !payload.data) return;

      setColumns(cloneColumns(payload.data.columns));
      setLeads(payload.data.leads);
    } catch {
      // Keep the current optimistic state visible if a background refresh fails.
    }
  }

  useEffect(() => {
    void refreshBoard();
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`${REALTIME_CHANNEL}:activities`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, () => void refreshBoard())
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => void refreshBoard())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function openCreateDialog() {
    setEditingActivity(null);
    setDialogOpen(true);
  }

  function openEditDialog(activity: ActivityWithLead) {
    setEditingActivity(activity);
    setDialogOpen(true);
  }

  async function handleSubmit(values: ActivityFormValues) {
    setSaving(true);

    try {
      const response = await fetch(editingActivity ? `/api/activities/${editingActivity.id}` : "/api/activities", {
        method: editingActivity ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
        cache: "no-store"
      });

      const payload = (await response.json().catch(() => ({ error: "Nao foi possivel salvar a atividade." }))) as {
        error?: string;
      };

      if (!response.ok) {
        window.alert(payload.error ?? "Nao foi possivel salvar a atividade.");
        return;
      }

      setDialogOpen(false);
      setEditingActivity(null);
      await refreshBoard();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(activity: ActivityWithLead) {
    if (!window.confirm(`Excluir "${activity.title}"?`)) return;

    const previousColumns = columns;
    setColumns((current) =>
      current.map((column) => ({
        ...column,
        activities: column.activities.filter((item) => item.id !== activity.id)
      }))
    );

    try {
      const response = await fetch(`/api/activities/${activity.id}`, {
        method: "DELETE",
        cache: "no-store"
      });

      if (!response.ok) {
        setColumns(previousColumns);
        window.alert("Nao foi possivel excluir a atividade.");
        return;
      }

      await refreshBoard();
    } catch {
      setColumns(previousColumns);
      window.alert("Nao foi possivel excluir a atividade.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveActivityId(event.active.id.toString());
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveActivityId(null);

    const activeId = event.active.id.toString();
    const overId = event.over?.id.toString();
    if (!overId) return;

    const previousColumns = cloneColumns(columns);
    const source = findActivity(columns, activeId);
    if (!source) return;

    const overActivity = findActivity(columns, overId);
    const targetStatus = (overActivity?.column.id ?? overId) as ActivityStatus;
    const targetColumnExists = columns.some((column) => column.id === targetStatus);
    if (!targetColumnExists) return;

    if (source.column.id === targetStatus && overActivity?.activity.id === activeId) return;

    const nextColumns = cloneColumns(columns);
    const nextSource = getColumn(nextColumns, source.column.id);

    if (source.column.id === targetStatus) {
      const overIndex = overActivity?.index ?? nextSource.activities.length - 1;
      nextSource.activities = arrayMove(nextSource.activities, source.index, Math.max(overIndex, 0));
    } else {
      const movingIndex = nextSource.activities.findIndex((activity) => activity.id === activeId);
      const [movingActivity] = nextSource.activities.splice(movingIndex, 1);
      const nextTarget = getColumn(nextColumns, targetStatus);
      movingActivity.status = targetStatus;
      const overIndex = overActivity
        ? nextTarget.activities.findIndex((activity) => activity.id === overActivity.activity.id)
        : nextTarget.activities.length;
      nextTarget.activities.splice(overIndex >= 0 ? overIndex : nextTarget.activities.length, 0, movingActivity);
    }

    const normalizedColumns = cloneColumns(nextColumns);
    setColumns(normalizedColumns);

    const sourceColumn = getColumn(normalizedColumns, source.column.id);
    const targetColumn = getColumn(normalizedColumns, targetStatus);
    const newPosition = targetColumn.activities.findIndex((activity) => activity.id === activeId);

    try {
      const response = await fetch("/api/activities/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activityId: activeId,
          status: targetStatus,
          position: newPosition,
          sourceStatus: source.column.id,
          sourceOrderedIds: source.column.id === targetStatus ? undefined : orderedIds(sourceColumn),
          targetOrderedIds: orderedIds(targetColumn)
        }),
        cache: "no-store"
      });

      if (!response.ok) {
        setColumns(previousColumns);
        return;
      }
    } catch {
      setColumns(previousColumns);
      return;
    }

    await refreshBoard();
  }

  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="label-overline">Atividades</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Atividades</h1>
          <p className="mt-1.5 text-sm text-secondary">
            Organize tarefas comerciais, cotacoes e acompanhamentos do time.
          </p>
        </div>
        <Button onClick={openCreateDialog} className="gap-2 whitespace-nowrap">
          <Plus className="h-4 w-4" />
          Nova atividade
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveActivityId(null)}
      >
        <ScrollArea className="min-w-0 flex-1">
          <div className="flex h-[calc(100vh-145px)] gap-4 pb-6">
            {columns.map((column) => (
              <ActivityColumn key={column.id} column={column} onEdit={openEditDialog} onDelete={handleDelete} />
            ))}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeActivity ? (
            <div className="w-[310px]">
              <ActivityCard activity={activeActivity} draggable={false} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <ActivityDialog
        open={dialogOpen}
        activity={editingActivity}
        leads={leads}
        saving={saving}
        onClose={() => {
          if (!saving) setDialogOpen(false);
        }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
