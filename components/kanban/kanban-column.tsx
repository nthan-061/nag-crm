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
  onSelectLead
}: {
  column: Column;
  cards: KanbanCardRecord[];
  selectedLeadId: string | null;
  onSelectLead: (leadId: string) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: column.id });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "glass-panel flex h-full min-w-[320px] max-w-[320px] flex-col rounded-[28px] border p-4",
        isOver && "border-accent/40 bg-accent/5"
      )}
    >
      <header className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: column.cor ?? "#3B82F6" }} />
          <div>
            <h3 className="text-sm font-semibold text-foreground">{column.nome}</h3>
            <p className="text-xs text-secondary">{cards.length} cards</p>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-220px)]">
        <div className="space-y-3 pr-3">
          {cards.map((card) => (
            <KanbanCard
              key={card.card_id}
              card={card}
              isSelected={selectedLeadId === card.lead_id}
              onSelect={onSelectLead}
            />
          ))}
        </div>
      </ScrollArea>
    </section>
  );
}
