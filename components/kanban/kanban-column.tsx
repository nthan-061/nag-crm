"use client";

import { useDroppable } from "@dnd-kit/core";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Column, KanbanCardRecord } from "@/lib/types/database";

export function KanbanColumn({
  column,
  cards,
  selectedLeadId,
  onSelectLead,
  onOpenChat,
  movingCardId
}: {
  column: Column;
  cards: KanbanCardRecord[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
  onOpenChat?: (leadId: string) => void;
  movingCardId?: string | null;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex h-full min-w-[300px] max-w-[300px] flex-col rounded-2xl border border-border/50 transition-all duration-150",
        "bg-white/70 backdrop-blur-sm shadow-card",
        isOver && "border-accent/35 bg-accent/[0.04] shadow-glow"
      )}
    >
      {/* ── Column header ──────────────────────── */}
      <header className="flex items-center justify-between border-b border-border/40 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          {/* Color indicator */}
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full ring-1 ring-primary/15"
            style={{ backgroundColor: column.cor ?? "#2563EB" }}
          />
          <h3 className="text-sm font-semibold leading-none text-foreground">
            {column.nome}
          </h3>
        </div>
        {/* Card count badge */}
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-md border border-border/60 bg-surface/60 px-1.5 text-[11px] font-bold text-secondary/80 tabular-nums">
          {cards.length}
        </span>
      </header>

      {/* ── Cards list ─────────────────────────── */}
      <ScrollArea className="h-[calc(100vh-170px)] flex-1">
        <div className="space-y-2 p-2.5">
          {cards.length === 0 && (
            <div className="flex flex-col items-center justify-center py-9 text-center">
              <div
                className="h-8 w-8 rounded-full opacity-30"
                style={{ backgroundColor: column.cor ?? "#2563EB", filter: "blur(8px)" }}
              />
              <p className="mt-3 text-xs text-tertiary">Nenhum lead aqui</p>
            </div>
          )}
          {cards.map((card) => (
            <KanbanCard
              key={card.card_id}
              card={card}
              isSelected={selectedLeadId === card.lead_id}
              onSelect={onSelectLead}
              onOpenChat={onOpenChat}
              isPersisting={movingCardId === card.card_id}
            />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
