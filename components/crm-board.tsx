"use client";

import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useMemo, useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { ScrollArea } from "@/components/ui/scroll-area";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Column, KanbanCardRecord } from "@/lib/types/database";

export function CrmBoard({
  initialColumns,
  initialCards
}: {
  initialColumns: Column[];
  initialCards: KanbanCardRecord[];
}) {
  const [columns] = useState(initialColumns);
  const [cards, setCards] = useState(initialCards);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialCards[0]?.lead_id ?? null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function refreshCards() {
    const response = await fetch("/api/cards");
    const payload = (await response.json()) as { data: KanbanCardRecord[] };
    setCards(payload.data ?? []);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.id?.toString();
    const overId = event.over?.id?.toString();
    const fromColumnId = event.active.data.current?.fromColumnId as string | undefined;

    if (!activeId || !overId || fromColumnId === overId) return;

    setCards((current) =>
      current.map((card) =>
        card.card_id === activeId ? { ...card, coluna_id: overId, ultima_interacao: new Date().toISOString() } : card
      )
    );

    await fetch("/api/cards/move", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cardId: activeId,
        fromColumnId,
        toColumnId: overId
      })
    });

    await refreshCards();
  }

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(REALTIME_CHANNEL)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refreshCards())
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => void refreshCards())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const groupedCards = useMemo(
    () =>
      columns.reduce<Record<string, KanbanCardRecord[]>>((acc, column) => {
        acc[column.id] = cards.filter((card) => card.coluna_id === column.id);
        return acc;
      }, {}),
    [cards, columns]
  );

  const selectedCard = cards.find((card) => card.lead_id === selectedLeadId) ?? null;

  return (
    <div className="grid h-screen grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Pipeline em tempo real</p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">Kanban comercial</h2>
          <p className="mt-2 text-sm text-secondary">
            Arraste cards entre etapas e acompanhe as conversas no painel lateral.
          </p>
        </div>

        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <ScrollArea className="w-full">
            <div className="flex min-h-[calc(100vh-150px)] gap-4 pb-6">
              {columns.map((column) => (
                <KanbanColumn
                  key={column.id}
                  column={column}
                  cards={groupedCards[column.id] ?? []}
                  selectedLeadId={selectedLeadId}
                  onSelectLead={setSelectedLeadId}
                />
              ))}
            </div>
          </ScrollArea>
        </DndContext>
      </div>

      <div className="min-h-[500px]">
        <ChatPanel selectedCard={selectedCard} />
      </div>
    </div>
  );
}
