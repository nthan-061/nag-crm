"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ActivityCard } from "@/components/activities/activity-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ActivityBoardColumn, ActivityWithLead } from "@/lib/types/database";

const COLUMN_DOT: Record<string, string> = {
  todo: "bg-accent",
  doing: "bg-warning",
  done: "bg-success"
};

export function ActivityColumn({
  column,
  onEdit,
  onDelete,
  movingActivityId,
  deletingActivityId
}: {
  column: ActivityBoardColumn;
  onEdit: (activity: ActivityWithLead) => void;
  onDelete: (activity: ActivityWithLead) => void;
  movingActivityId?: string | null;
  deletingActivityId?: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: column.id,
    data: { type: "column", status: column.id }
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-[310px] max-w-[310px] flex-col rounded-2xl border border-border/50 transition-all duration-150",
        "bg-white/70 backdrop-blur-sm shadow-card",
        isOver && "border-accent/35 bg-accent/[0.04] shadow-glow"
      )}
    >
      <header className="flex items-center justify-between border-b border-border/40 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className={cn("h-2.5 w-2.5 rounded-full ring-1 ring-primary/15", COLUMN_DOT[column.id])} />
          <h2 className="text-sm font-semibold leading-none text-foreground">{column.title}</h2>
        </div>
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-border/60 bg-surface/60 px-1.5 text-[11px] font-bold tabular-nums text-secondary/80">
          {column.activities.length}
        </span>
      </header>

      <ScrollArea className="h-[calc(100vh-230px)] flex-1">
        <SortableContext items={column.activities.map((activity) => activity.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2.5 p-3">
            {column.activities.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/45 px-4 py-10 text-center">
                <div className="h-8 w-8 rounded-full bg-accent/20 blur-md" />
                <p className="mt-3 text-xs text-tertiary">Nenhuma atividade aqui</p>
              </div>
            )}
            {column.activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onEdit={onEdit}
                onDelete={onDelete}
                isBusy={movingActivityId === activity.id || deletingActivityId === activity.id}
              />
            ))}
          </div>
        </SortableContext>
      </ScrollArea>
    </section>
  );
}
