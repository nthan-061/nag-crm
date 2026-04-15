"use client";

import { CalendarClock, X } from "lucide-react";
import type { ScheduledMessage } from "@/lib/types/database";

function formatSchedule(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ScheduledMessagesPanel({
  items,
  onCancel,
  cancelingId
}: {
  items: ScheduledMessage[];
  onCancel: (scheduledMessageId: string) => Promise<void>;
  cancelingId: string | null;
}) {
  const pending = items.filter((item) => item.status === "pending" || item.status === "processing");
  if (pending.length === 0) return null;

  return (
    <div className="border-t border-border/35 bg-accent/[0.035] px-3 py-2">
      <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
        <CalendarClock className="h-3.5 w-3.5" />
        Programadas
      </div>
      <div className="space-y-1.5">
        {pending.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-2 rounded-lg border border-border/50 bg-white/70 px-2.5 py-2 text-xs">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{formatSchedule(item.scheduled_for)}</p>
              <p className="mt-0.5 truncate text-secondary">{item.content}</p>
            </div>
            {item.status === "pending" ? (
              <button
                type="button"
                onClick={() => void onCancel(item.id)}
                disabled={cancelingId === item.id}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-secondary hover:bg-danger/10 hover:text-danger disabled:opacity-40"
                aria-label="Cancelar mensagem programada"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <span className="rounded-md bg-warning/10 px-2 py-1 text-[10px] font-semibold uppercase text-warning">
                Processando
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
