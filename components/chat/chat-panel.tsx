"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { MessageCircleMore, Phone, Globe, Trash2 } from "lucide-react";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList, type MessageListHandle } from "@/components/chat/message-list";
import { NotesPanel } from "@/components/chat/notes-panel";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { cn, formatPhone } from "@/lib/utils";
import type { KanbanCardRecord, Message } from "@/lib/types/database";

const PRIORITY_COLOR: Record<string, string> = {
  alta: "text-danger",
  media: "text-warning",
  baixa: "text-success",
};

export function ChatPanel({
  selectedCard,
  onDeleteLead,
  className,
  headerActions,
  showTabs = true,
  showDeleteAction = true,
}: {
  selectedCard: KanbanCardRecord | null;
  onDeleteLead: (leadId: string) => Promise<void>;
  className?: string;
  headerActions?: ReactNode;
  showTabs?: boolean;
  showDeleteAction?: boolean;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const [isDeleting, startDeleteTransition] = useTransition();
  const latestRequestId = useRef(0);
  const messageListRef = useRef<MessageListHandle>(null);

  const loadMessages = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!selectedCard?.lead_id) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRequestId.current;
    if (!silent) setIsLoading(true);
    if (silent) setIsRefreshing(true);

    try {
      const response = await fetch(`/api/messages/${selectedCard.lead_id}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: Message[] };
      if (requestId !== latestRequestId.current || !Array.isArray(payload.data)) return;
      setMessages(payload.data);
    } finally {
      if (!silent && requestId === latestRequestId.current) setIsLoading(false);
      if (silent && requestId === latestRequestId.current) setIsRefreshing(false);
    }
  }, [selectedCard?.lead_id]);

  useEffect(() => {
    setActiveTab("chat");
    if (!selectedCard?.lead_id) { setMessages([]); setIsLoading(false); return; }
    setMessages([]);
    void loadMessages();
  }, [loadMessages, selectedCard?.lead_id]);

  useEffect(() => {
    if (!selectedCard?.lead_id) return;
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`${REALTIME_CHANNEL}-chat-${selectedCard.lead_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void loadMessages({ silent: true }))
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [loadMessages, selectedCard?.lead_id]);

  useEffect(() => {
    if (!selectedCard?.lead_id) return;
    const interval = window.setInterval(() => void loadMessages({ silent: true }), 5000);
    return () => window.clearInterval(interval);
  }, [loadMessages, selectedCard?.lead_id]);

  useEffect(() => {
    if (!selectedCard?.lead_id) return;

    function processPendingMedia() {
      void fetch("/api/messages/media/process-pending?limit=2", { cache: "no-store" }).catch(() => {
        // Background media hydration is best-effort; chat polling keeps the UI fresh.
      });
    }

    processPendingMedia();
    const interval = window.setInterval(processPendingMedia, 30000);
    return () => window.clearInterval(interval);
  }, [selectedCard?.lead_id]);

  if (!selectedCard) {
    return (
      <div className={cn("glass-panel flex h-full flex-col items-center justify-center rounded-2xl border border-border/50 text-center p-8 shadow-card", className)}>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/20 bg-accent-muted/40">
          <MessageCircleMore className="h-7 w-7 text-accent/70" />
        </div>
        <h2 className="mt-5 text-base font-semibold text-foreground">Selecione um lead</h2>
        <p className="mt-2 max-w-[200px] text-sm text-secondary/70 leading-relaxed">
          Clique em um card no pipeline para abrir a conversa.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("glass-panel flex h-full flex-col rounded-2xl border border-border/50 shadow-card overflow-hidden", className)}>

      {/* ── Lead header ──────────────────────────── */}
      <div className="border-b border-border/40 px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="label-overline">Conversa ativa</p>
            <h2 className="mt-1.5 text-base font-bold tracking-tight text-foreground leading-tight truncate">
              {selectedCard.lead_nome}
            </h2>
          </div>

          <div className="flex flex-shrink-0 items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1 text-[11px] font-medium text-secondary/80">
              <Globe className="h-3 w-3" />
              {selectedCard.lead_origem ?? "whatsapp"}
            </span>
            {headerActions}
          </div>
        </div>

        {/* Contact row */}
        <div className="mt-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-secondary/80">
            <Phone className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="font-mono">{formatPhone(selectedCard.lead_telefone)}</span>
          </div>
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${PRIORITY_COLOR[selectedCard.prioridade] ?? "text-secondary"}`}>
            {selectedCard.prioridade}
          </span>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────── */}
      {showTabs ? (
      <div className="flex border-b border-border/40 bg-muted/30">
        {(["chat", "notes"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`flex-1 px-4 py-2.5 text-xs font-semibold uppercase tracking-widest transition-all ${
              activeTab === tab
                ? "border-b-2 border-accent text-foreground bg-accent/[0.04]"
                : "text-secondary/60 hover:text-secondary"
            }`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "chat" ? "Conversa" : "Anotações"}
          </button>
        ))}
      </div>
      ) : null}

      {/* ── Content ──────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {activeTab === "chat" && isLoading && messages.length === 0 ? (
          <div className="flex flex-1 flex-col justify-end gap-3 p-4">
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className={`h-12 animate-pulse rounded-2xl bg-muted/70 ${item % 2 === 0 ? "mr-16" : "ml-16"}`}
              />
            ))}
          </div>
        ) : activeTab === "chat" || !showTabs ? (
          <>
            {isRefreshing ? (
              <div className="border-b border-border/30 bg-accent/[0.04] px-4 py-1.5 text-center text-[11px] font-medium text-secondary">
                Atualizando conversa...
              </div>
            ) : null}
            <MessageList ref={messageListRef} messages={messages} leadId={selectedCard.lead_id} />
            <div className="flex-shrink-0 border-t border-border/40 p-4">
              <MessageInput
                leadId={selectedCard.lead_id}
                onSent={async () => {
                  // Force scroll to bottom when the user sends a message, regardless
                  // of their current scroll position, then load the updated list.
                  messageListRef.current?.scrollToBottom();
                  await loadMessages();
                }}
              />
            </div>
          </>
        ) : (
          <NotesPanel leadId={selectedCard.lead_id} />
        )}
      </div>

      {/* ── Delete action ────────────────────────── */}
      {showDeleteAction ? (
      <div className="flex-shrink-0 border-t border-border/30 px-4 py-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-center text-xs text-tertiary hover:bg-danger/10 hover:text-danger"
          disabled={isDeleting}
          onClick={() => {
            startDeleteTransition(() => { void onDeleteLead(selectedCard.lead_id); });
          }}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {isDeleting ? "Apagando..." : "Apagar lead"}
        </Button>
      </div>
      ) : null}
    </div>
  );
}
