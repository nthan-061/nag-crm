"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, GripVertical, Link2, Pencil, Trash2 } from "lucide-react";
import { cn, formatPhone } from "@/lib/utils";
import type { ActivityPriority, ActivityWithLead } from "@/lib/types/database";

const PRIORITY_LABEL: Record<ActivityPriority, string> = {
  low: "Baixa",
  medium: "Media",
  high: "Alta"
};

const PRIORITY_CLASS: Record<ActivityPriority, string> = {
  low: "border-success/30 bg-success/[0.08] text-success",
  medium: "border-warning/30 bg-warning/[0.08] text-warning",
  high: "border-danger/30 bg-danger/[0.08] text-danger"
};

function formatDueDate(value: string | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  }).format(new Date(value));
}

function isOverdue(activity: ActivityWithLead) {
  if (!activity.due_date || activity.status === "done") return false;
  const dueDate = new Date(activity.due_date);
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < Date.now();
}

export function ActivityCard({
  activity,
  onEdit,
  onDelete,
  draggable = true,
  isOverlay = false,
  isBusy = false
}: {
  activity: ActivityWithLead;
  onEdit?: (activity: ActivityWithLead) => void;
  onDelete?: (activity: ActivityWithLead) => void;
  draggable?: boolean;
  isOverlay?: boolean;
  isBusy?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
    data: { type: "activity", activityId: activity.id, status: activity.status },
    disabled: !draggable
  });
  const overdue = isOverdue(activity);
  const dueDate = formatDueDate(activity.due_date);

  return (
    <article
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "glass-panel rounded-xl border border-border/50 p-4 shadow-card transition-all duration-150",
        "hover:border-border-strong hover:shadow-premium",
        isDragging && "opacity-30 scale-[0.98]",
        isOverlay && "rotate-[0.5deg] shadow-elevated ring-1 ring-accent/25 opacity-95",
        isBusy && "opacity-70 ring-1 ring-accent/20"
      )}
      aria-busy={isBusy}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-tertiary transition hover:bg-accent/[0.06] hover:text-secondary"
          aria-label="Arrastar atividade"
          {...(draggable ? attributes : {})}
          {...(draggable ? listeners : {})}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold leading-snug text-foreground">{activity.title}</h3>
            <span className={cn("rounded-md border px-2 py-1 text-[10px] font-bold uppercase", PRIORITY_CLASS[activity.priority])}>
              {PRIORITY_LABEL[activity.priority]}
            </span>
          </div>

          {activity.description && (
            <p className="mt-2 line-clamp-3 rounded-lg bg-muted/60 px-3 py-2 text-[12px] leading-relaxed text-secondary/85">
              {activity.description}
            </p>
          )}

          <div className="mt-3 space-y-2">
            {dueDate && (
              <div className={cn("flex items-center gap-1.5 text-[11px]", overdue ? "text-danger" : "text-tertiary")}>
                <CalendarDays className="h-3.5 w-3.5" />
                <span>{overdue ? "Atrasada" : "Vence"} em {dueDate}</span>
              </div>
            )}

            {activity.lead && (
              <div className="rounded-lg border border-border/45 bg-surface/50 px-3 py-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-secondary">
                  <Link2 className="h-3.5 w-3.5 text-accent" />
                  <span className="truncate">{activity.lead.nome}</span>
                </div>
                <p className="mt-1 font-mono text-[11px] text-tertiary">{formatPhone(activity.lead.telefone)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {!isOverlay && (
        <div className="mt-3 flex justify-end gap-1.5 border-t border-border/35 pt-3">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition hover:bg-accent/[0.06] hover:text-foreground"
            onClick={() => onEdit?.(activity)}
            aria-label="Editar atividade"
            disabled={isBusy}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-secondary transition hover:bg-danger/[0.08] hover:text-danger"
            onClick={() => onDelete?.(activity)}
            aria-label="Excluir atividade"
            disabled={isBusy}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </article>
  );
}
