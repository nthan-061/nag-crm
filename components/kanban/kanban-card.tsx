"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Clock, Globe, MessageCircleMore } from "lucide-react";
import { cn, formatPhone, formatRelativeTime } from "@/lib/utils";
import type { KanbanCardRecord } from "@/lib/types/database";

const PRIORITY_BORDER: Record<string, string> = {
  alta:  "border-l-danger",
  media: "border-l-warning",
  baixa: "border-l-success",
};

const PRIORITY_DOT: Record<string, string> = {
  alta:  "bg-danger",
  media: "bg-warning",
  baixa: "bg-success",
};

const PRIORITY_LABEL: Record<string, string> = {
  alta:  "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function KanbanCard({
  card,
  isSelected,
  onSelect,
  onOpenChat,
  draggable = true,
  isOverlay = false,
  isPersisting = false,
}: {
  card: KanbanCardRecord;
  isSelected: boolean;
  onSelect: (leadId: string) => void;
  onOpenChat?: (leadId: string) => void;
  draggable?: boolean;
  isOverlay?: boolean;
  isPersisting?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card.card_id,
    data: { cardId: card.card_id, fromColumnId: card.coluna_id },
    disabled: !draggable,
  });

  const dragStyle = draggable ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={dragStyle}
      className={cn(
        // Base
        "glass-panel relative rounded-xl border border-l-[3px] border-border/50 p-4 transition-all duration-150",
        // Priority left border
        PRIORITY_BORDER[card.prioridade] ?? "border-l-border",
        // Interactive states
        draggable && "cursor-grab active:cursor-grabbing",
        "hover:border-border-strong hover:shadow-premium",
        // Selected state
        isSelected && "border-accent/40 bg-accent/[0.06] shadow-glow",
        // Drag states
        isDragging && "opacity-30 scale-[0.98]",
        isOverlay && "rotate-[0.5deg] shadow-elevated ring-1 ring-accent/20 opacity-95",
        isPersisting && "ring-1 ring-accent/25 after:absolute after:inset-x-4 after:top-2 after:h-0.5 after:rounded-full after:bg-accent/60 after:content-[''] after:animate-pulse",
      )}
      {...(draggable ? listeners : {})}
      {...(draggable ? attributes : {})}
      onClick={() => onSelect(card.lead_id)}
      aria-busy={isPersisting}
    >
      {/* ── Header: name + priority ────────────── */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-snug text-foreground">
            {card.lead_nome}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-secondary/70">
            {formatPhone(card.lead_telefone)}
          </p>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5 rounded-md border border-border/50 bg-surface/60 px-2 py-1">
          <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", PRIORITY_DOT[card.prioridade])} />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-secondary/80">
            {PRIORITY_LABEL[card.prioridade]}
          </span>
        </div>
      </div>

      {/* ── Message preview ────────────────────── */}
      {card.ultima_mensagem ? (
        <p className="mt-3 line-clamp-2 rounded-lg bg-muted/60 px-3 py-2 text-[12px] leading-relaxed text-secondary/80">
          {card.ultima_mensagem}
        </p>
      ) : (
        <p className="mt-3 rounded-lg border border-dashed border-border/40 px-3 py-2 text-[12px] italic text-tertiary">
          Sem mensagens ainda
        </p>
      )}

      {/* ── Footer: time + origin ──────────────── */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-tertiary">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(card.ultima_interacao)}</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-tertiary">
          <Globe className="h-3 w-3" />
          <span className="capitalize">{card.lead_origem ?? "manual"}</span>
        </div>
      </div>

      {onOpenChat && !isOverlay ? (
        <button
          type="button"
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-accent/20 bg-accent/[0.07] px-3 py-2 text-xs font-semibold text-accent transition hover:border-accent/35 hover:bg-accent/[0.12]"
          onClick={(event) => {
            event.stopPropagation();
            onOpenChat(card.lead_id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          aria-label={`Abrir conversa de ${card.lead_nome}`}
        >
          <MessageCircleMore className="h-3.5 w-3.5" />
          Abrir conversa
        </button>
      ) : null}
    </div>
  );
}
