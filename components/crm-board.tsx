"use client";

import {
  closestCorners,
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { ColumnManager } from "@/components/kanban/column-manager";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { LEAD_DELETED_EVENT, LEAD_DELETED_STORAGE_KEY } from "@/lib/lead-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { Column, KanbanCardRecord } from "@/lib/types/database";

export function CrmBoard({
  initialColumns,
  initialCards
}: {
  initialColumns: Column[];
  initialCards: KanbanCardRecord[];
}) {
  const [columns, setColumns] = useState(initialColumns);
  const [cards, setCards] = useState(initialCards);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialCards[0]?.lead_id ?? null);
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [movingCardId, setMovingCardId] = useState<string | null>(null);
  const [boardNotice, setBoardNotice] = useState<string | null>(null);
  const latestRefreshId = useRef(0);
  const router = useRouter();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function refreshCards() {
    const refreshId = ++latestRefreshId.current;

    try {
      const response = await fetch("/api/cards", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { data?: KanbanCardRecord[] };
      if (refreshId !== latestRefreshId.current || !Array.isArray(payload.data)) return;

      setCards(payload.data);
    } catch {
      // Preserve the current UI state when background refresh fails.
    }
  }

  async function refreshColumns() {
    try {
      const response = await fetch("/api/columns", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { data?: Column[] };
      if (!Array.isArray(payload.data)) return;

      setColumns(payload.data);
    } catch {
      // Keep the current board visible if columns refresh fails.
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setBoardNotice(null);
    setActiveCardId(event.active.id?.toString() ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.id?.toString();
    const overId = event.over?.id?.toString();
    const fromColumnId = event.active.data.current?.fromColumnId as string | undefined;
    setActiveCardId(null);

    if (!activeId || !overId || fromColumnId === overId) return;

    const previousCards = cards;
    setMovingCardId(activeId);
    setBoardNotice("Movendo lead...");
    setCards((current) =>
      current.map((card) =>
        card.card_id === activeId ? { ...card, coluna_id: overId, ultima_interacao: new Date().toISOString() } : card
      )
    );

    try {
      const response = await fetch("/api/cards/move", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: activeId, fromColumnId, toColumnId: overId })
      });

      if (!response.ok) {
        setCards(previousCards);
        setBoardNotice("Nao foi possivel mover o lead. A posicao anterior foi restaurada.");
        return;
      }
    } catch {
      setCards(previousCards);
      setBoardNotice("Nao foi possivel mover o lead. A posicao anterior foi restaurada.");
      return;
    } finally {
      setMovingCardId(null);
    }

    await refreshCards();
    setBoardNotice(null);
  }

  const activeCard = cards.find((card) => card.card_id === activeCardId) ?? null;

  useEffect(() => {
    void refreshCards();
    void refreshColumns();
  }, []);

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

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshCards();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== LEAD_DELETED_STORAGE_KEY || !event.newValue) return;
      void refreshCards();
    }
    function handleCustomEvent() {
      void refreshCards();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LEAD_DELETED_EVENT, handleCustomEvent);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LEAD_DELETED_EVENT, handleCustomEvent);
    };
  }, []);

  useEffect(() => {
    if (!cards.length) {
      if (selectedLeadId !== null) setSelectedLeadId(null);
      return;
    }

    if (!selectedLeadId) {
      setSelectedLeadId(cards[0].lead_id);
      return;
    }

    if (!cards.some((card) => card.lead_id === selectedLeadId)) {
      setSelectedLeadId(cards[0].lead_id);
    }
  }, [cards, selectedLeadId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search), 180);
    return () => window.clearTimeout(timeout);
  }, [search]);

  const groupedCards = useMemo(
    () =>
      columns.reduce<Record<string, KanbanCardRecord[]>>((acc, column) => {
        const normalizedSearch = debouncedSearch.trim().toLowerCase();
        acc[column.id] = cards.filter((card) => {
          if (card.coluna_id !== column.id) return false;
          if (!normalizedSearch) return true;

          return (
            card.lead_nome.toLowerCase().includes(normalizedSearch) ||
            card.lead_telefone.includes(normalizedSearch) ||
            (card.ultima_mensagem ?? "").toLowerCase().includes(normalizedSearch)
          );
        });
        return acc;
      }, {}),
    [cards, columns, debouncedSearch]
  );

  return (
    <div className="h-full min-w-0">
      <div className="mb-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="label-overline">Pipeline em tempo real</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Kanban comercial
            </h2>
            <p className="mt-1 text-[13px] text-secondary">
              Arraste cards entre etapas. Use o botao de conversa em cada lead para abrir o chat em tela dedicada.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-[260px]">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar lead, telefone ou mensagem"
              />
            </div>
            <Button
              variant="secondary"
              className="whitespace-nowrap"
              onClick={() => setShowColumnManager((current) => !current)}
            >
              {showColumnManager ? "Fechar" : "Editar colunas"}
            </Button>
          </div>
        </div>
      </div>

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onUpdated={async () => {
            await refreshColumns();
            await refreshCards();
          }}
        />
      )}

      {boardNotice && (
        <div className="mb-3 rounded-xl border border-accent/20 bg-accent/[0.06] px-3 py-2 text-xs font-medium text-secondary">
          {boardNotice}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveCardId(null)}
      >
        <ScrollArea className="w-full">
          <div className="flex min-h-[calc(100vh-130px)] gap-3 pb-4">
            {columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                cards={groupedCards[column.id] ?? []}
                selectedLeadId={selectedLeadId}
                onSelectLead={setSelectedLeadId}
                onOpenChat={(leadId) => router.push(`/pipeline/chat/${leadId}`)}
                movingCardId={movingCardId}
              />
            ))}
          </div>
        </ScrollArea>

        <DragOverlay>
          {activeCard ? (
            <div className="w-[300px]">
              <KanbanCard
                card={activeCard}
                isSelected={selectedLeadId === activeCard.lead_id}
                onSelect={setSelectedLeadId}
                draggable={false}
                isOverlay
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
