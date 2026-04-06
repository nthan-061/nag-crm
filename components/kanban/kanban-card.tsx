"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { MessageSquare, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PRIORITY_STYLES } from "@/lib/constants";
import { cn, formatPhone, formatRelativeTime } from "@/lib/utils";
import type { KanbanCardRecord } from "@/lib/types/database";

export function KanbanCard({
  card,
  isSelected,
  onSelect
}: {
  card: KanbanCardRecord;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.card_id,
    data: { cardId: card.card_id, fromColumnId: card.coluna_id }
  });

  return (
    <Card
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      className={cn(
        "cursor-grab border-white/5 p-4 transition hover:border-accent/30 hover:bg-white/[0.04]",
        isSelected && "border-accent/40 bg-accent/10",
        isDragging && "opacity-60"
      )}
      {...listeners}
      {...attributes}
      onClick={() => onSelect(card.lead_id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{card.lead_nome}</p>
          <div className="mt-1 flex items-center gap-1 text-xs text-secondary">
            <Phone className="h-3 w-3" />
            <span>{formatPhone(card.lead_telefone)}</span>
          </div>
        </div>
        <Badge className={cn("capitalize", PRIORITY_STYLES[card.prioridade])}>{card.prioridade}</Badge>
      </div>

      <div className="mt-4 rounded-xl bg-background/60 p-3">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <MessageSquare className="h-3 w-3" />
          <span>Última mensagem</span>
        </div>
        <p className="mt-2 max-h-10 overflow-hidden text-sm text-foreground/90">
          {card.ultima_mensagem ?? "Sem mensagens ainda"}
        </p>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-secondary">
        <span>{formatRelativeTime(card.ultima_interacao)}</span>
        <span>{card.lead_origem ?? "manual"}</span>
      </div>
    </Card>
  );
}
