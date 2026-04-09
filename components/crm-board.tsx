"use client";

import { DndContext, DragOverlay, type DragEndEvent, type DragStartEvent, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { ColumnManager } from "@/components/kanban/column-manager";
import { KanbanCard } from "@/components/kanban/kanban-card";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { LEAD_DELETED_STORAGE_KEY, emitLeadDeleted } from "@/lib/lead-events";
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
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const latestRefreshId = useRef(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  async function refreshCards() {
    const refreshId = ++latestRefreshId.current;

    try {
      const response = await fetch("/api/cards", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: KanbanCardRecord[] };
      if (refreshId !== latestRefreshId.current || !Array.isArray(payload.data)) {
        return;
      }

      setCards(payload.data);
    } catch {
      // Preserve the current UI state when background refresh fails.
    }
  }

  async function refreshColumns() {
    try {
      const response = await fetch("/api/columns", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: Column[] };
      if (!Array.isArray(payload.data)) {
        return;
      }

      setColumns(payload.data);
    } catch {
      // Keep the current board visible if columns refresh fails.
    }
  }

  async function handleDeleteLead(leadId: string) {
    const card = cards.find((item) => item.lead_id === leadId);
    const leadName = card?.lead_nome ?? "este lead";
    if (!window.confirm(`Tem certeza que deseja apagar ${leadName}? Esta acao remove card e mensagens relacionadas.`)) {
      return;
    }

    const previousCards = cards;
    setCards((current) => current.filter((item) => item.lead_id !== leadId));

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "DELETE",
        cache: "no-store"
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({ error: "Nao foi possivel apagar o lead." }))) as {
          error?: string;
        };
        setCards(previousCards);
        window.alert(payload.error ?? "Nao foi possivel apagar o lead.");
        return;
      }

      emitLeadDeleted(leadId);
      await refreshCards();
    } catch {
      setCards(previousCards);
      window.alert("Nao foi possivel apagar o lead.");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCardId(event.active.id?.toString() ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const activeId = event.active.id?.toString();
    const overId = event.over?.id?.toString();
    const fromColumnId = event.active.data.current?.fromColumnId as string | undefined;
    setActiveCardId(null);

    if (!activeId || !overId || fromColumnId === overId) return;

    const previousCards = cards;
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
        return;
      }
    } catch {
      setCards(previousCards);
      return;
    }

    await refreshCards();
  }

  const activeCard = cards.find((card) => card.card_id === activeCardId) ?? null;

  // Fetch fresh cards immediately on mount — the SSR snapshot may be stale
  // if the router served a cached version of the page (Next.js 14 client cache).
  useEffect(() => {
    void refreshCards();
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

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    if (!cards.length) {
      if (selectedLeadId !== null) {
        setSelectedLeadId(null);
      }
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

  const groupedCards = useMemo(
    () =>
      columns.reduce<Record<string, KanbanCardRecord[]>>((acc, column) => {
        const normalizedSearch = search.trim().toLowerCase();
        acc[column.id] = cards.filter((card) => {
          const matchesColumn = card.coluna_id === column.id;
          if (!matchesColumn) return false;
          if (!normalizedSearch) return true;

          return (
            card.lead_nome.toLowerCase().includes(normalizedSearch) ||
            card.lead_telefone.includes(normalizedSearch) ||
            (card.ultima_mensagem ?? "").toLowerCase().includes(normalizedSearch)
          );
        });
        return acc;
      }, {}),
    [cards, columns, search]
  );

  const selectedCard = cards.find((card) => card.lead_id === selectedLeadId) ?? null;

  return (
    <div className="grid h-screen grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Pipeline em tempo real</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-3xl font-semibold text-foreground">Kanban comercial</h2>
              <p className="mt-2 text-sm text-secondary">
                Arraste cards entre etapas e acompanhe as conversas no painel lateral.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-[280px]">
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar lead, telefone ou mensagem"
                />
              </div>
              <Button variant="secondary" onClick={() => setShowColumnManager((current) => !current)}>
                {showColumnManager ? "Fechar colunas" : "Editar colunas"}
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

        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={() => setActiveCardId(null)}>
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
          <DragOverlay>
            {activeCard ? (
              <div className="w-[320px]">
                <KanbanCard card={activeCard} isSelected={selectedLeadId === activeCard.lead_id} onSelect={setSelectedLeadId} draggable={false} isOverlay />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <div className="min-h-[500px]">
        <ChatPanel selectedCard={selectedCard} onDeleteLead={handleDeleteLead} />
      </div>
    </div>
  );
}
