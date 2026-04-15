"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircleMore, PanelRightClose, PanelRightOpen, Search } from "lucide-react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NotesPanel } from "@/components/chat/notes-panel";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { cn, formatPhone, formatRelativeTime } from "@/lib/utils";
import type { KanbanCardRecord } from "@/lib/types/database";

export function ConversationsWorkspace({
  initialCards
}: {
  initialCards: KanbanCardRecord[];
}) {
  const [cards, setCards] = useState(initialCards);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(initialCards[0]?.lead_id ?? null);
  const [search, setSearch] = useState("");
  const [notesOpen, setNotesOpen] = useState(true);
  const latestRefreshId = useRef(0);

  async function refreshCards() {
    const refreshId = ++latestRefreshId.current;

    try {
      const response = await fetch("/api/conversations", { cache: "no-store" });
      if (!response.ok) return;

      const payload = (await response.json()) as { data?: KanbanCardRecord[] };
      if (refreshId !== latestRefreshId.current || !Array.isArray(payload.data)) return;

      setCards(payload.data);
    } catch {
      // Keep the current conversation list when background refresh fails.
    }
  }

  useEffect(() => {
    void refreshCards();
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`${REALTIME_CHANNEL}:conversations`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refreshCards())
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => void refreshCards())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!cards.length) {
      setSelectedLeadId(null);
      return;
    }

    if (!selectedLeadId || !cards.some((card) => card.lead_id === selectedLeadId)) {
      setSelectedLeadId(cards[0].lead_id);
    }
  }, [cards, selectedLeadId]);

  const filteredCards = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return cards;

    return cards.filter((card) =>
      card.lead_nome.toLowerCase().includes(normalized) ||
      card.lead_telefone.includes(normalized) ||
      (card.ultima_mensagem ?? "").toLowerCase().includes(normalized)
    );
  }, [cards, search]);

  const selectedCard = cards.find((card) => card.lead_id === selectedLeadId) ?? null;

  return (
    <section className="grid h-[calc(100vh-4.5rem)] min-h-0 grid-cols-1 gap-3 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 shadow-card">
        <div className="border-b border-border/40 p-3.5">
          <p className="label-overline">Conversas</p>
          <h1 className="mt-1 text-lg font-bold tracking-tight text-foreground">Inbox comercial</h1>
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tertiary" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar conversa"
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-2 p-2.5">
            {filteredCards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircleMore className="h-8 w-8 text-tertiary" />
                <p className="mt-3 text-xs text-secondary">Nenhuma conversa encontrada.</p>
              </div>
            ) : null}

            {filteredCards.map((card) => {
              const isActive = card.lead_id === selectedLeadId;

              return (
                <button
                  key={card.card_id}
                  type="button"
                  className={cn(
                    "w-full rounded-xl border p-2.5 text-left transition-all",
                    isActive
                      ? "border-accent/35 bg-accent/[0.08] shadow-card"
                      : "border-border/35 bg-white/60 hover:border-border-strong hover:bg-card-hover"
                  )}
                  onClick={() => setSelectedLeadId(card.lead_id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-bold text-foreground">{card.lead_nome}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-secondary">{formatPhone(card.lead_telefone)}</p>
                    </div>
                    <span className="text-[10px] text-tertiary">{formatRelativeTime(card.ultima_interacao)}</span>
                  </div>
                  <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-secondary">
                    {card.ultima_mensagem ?? "Sem mensagens ainda"}
                  </p>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </aside>

      <div
        className={cn(
          "grid min-h-0 gap-3 transition-all duration-200",
          notesOpen ? "xl:grid-cols-[minmax(0,1fr)_300px]" : "xl:grid-cols-[minmax(0,1fr)]"
        )}
      >
        <ChatPanel
          selectedCard={selectedCard}
          onDeleteLead={async () => undefined}
          className="min-h-0"
          showTabs={false}
          showDeleteAction={false}
          headerActions={
            selectedCard ? (
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 text-[11px] font-semibold text-secondary transition hover:bg-accent/[0.07] hover:text-foreground"
                onClick={() => setNotesOpen((current) => !current)}
                aria-label={notesOpen ? "Recolher anotacoes" : "Expandir anotacoes"}
              >
                {notesOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                {notesOpen ? "Ocultar notas" : "Notas"}
              </button>
            ) : null
          }
        />

        {notesOpen && selectedCard ? (
          <aside className="glass-panel hidden min-h-0 overflow-hidden rounded-2xl border border-border/60 shadow-card xl:flex xl:flex-col">
            <div className="flex items-center justify-between border-b border-border/40 px-4 py-4">
              <div>
                <p className="label-overline">Anotacoes</p>
                <h2 className="mt-1 text-sm font-bold text-foreground">{selectedCard.lead_nome}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-secondary transition hover:bg-accent/[0.06] hover:text-foreground"
                onClick={() => setNotesOpen(false)}
                aria-label="Recolher anotacoes"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <NotesPanel leadId={selectedCard.lead_id} />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
