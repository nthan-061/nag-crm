"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircleMore, PhoneCall } from "lucide-react";
import { MessageInput } from "@/components/chat/message-input";
import { MessageList } from "@/components/chat/message-list";
import { NotesPanel } from "@/components/chat/notes-panel";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { formatPhone } from "@/lib/utils";
import type { KanbanCardRecord, Message } from "@/lib/types/database";

export function ChatPanel({ selectedCard }: { selectedCard: KanbanCardRecord | null }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "notes">("chat");
  const latestRequestId = useRef(0);

  const loadMessages = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!selectedCard?.lead_id) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    const requestId = ++latestRequestId.current;

    if (!silent) {
      setIsLoading(true);
    }

    try {
      const response = await fetch(`/api/messages/${selectedCard.lead_id}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: Message[] };
      if (requestId !== latestRequestId.current || !Array.isArray(payload.data)) {
        return;
      }

      setMessages(payload.data);
    } finally {
      if (!silent && requestId === latestRequestId.current) {
        setIsLoading(false);
      }
    }
  }, [selectedCard?.lead_id]);

  useEffect(() => {
    setActiveTab("chat");

    if (!selectedCard?.lead_id) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

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

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadMessages, selectedCard?.lead_id]);

  useEffect(() => {
    if (!selectedCard?.lead_id) return;
    const interval = window.setInterval(() => {
      void loadMessages({ silent: true });
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadMessages, selectedCard?.lead_id]);

  return (
    <Card className="flex h-full flex-col p-5">
      {selectedCard ? (
        <>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-accent">Inbox</p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">{selectedCard.lead_nome}</h2>
              <div className="mt-2 flex items-center gap-2 text-sm text-secondary">
                <PhoneCall className="h-4 w-4" />
                <span>{formatPhone(selectedCard.lead_telefone)}</span>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-background/40 px-3 py-2 text-xs text-secondary">
              {selectedCard.lead_origem ?? "whatsapp"}
            </div>
          </div>

          <Separator className="my-5" />

          <div className="mb-4 flex rounded-2xl border border-border bg-background/40 p-1">
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${
                activeTab === "chat" ? "bg-accent text-white" : "text-secondary"
              }`}
              onClick={() => setActiveTab("chat")}
            >
              Conversa
            </button>
            <button
              type="button"
              className={`flex-1 rounded-xl px-3 py-2 text-sm transition ${
                activeTab === "notes" ? "bg-accent text-white" : "text-secondary"
              }`}
              onClick={() => setActiveTab("notes")}
            >
              Anotacoes
            </button>
          </div>

          {activeTab === "chat" && isLoading && messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center text-sm text-secondary">
              Carregando mensagens...
            </div>
          ) : activeTab === "chat" ? (
            <>
              <MessageList messages={messages} />
              <div className="mt-5">
                <MessageInput leadId={selectedCard.lead_id} onSent={loadMessages} />
              </div>
            </>
          ) : (
            <NotesPanel leadId={selectedCard.lead_id} />
          )}
        </>
      ) : (
        <div className="flex h-full flex-col items-center justify-center text-center">
          <div className="rounded-full border border-accent/20 bg-accent/10 p-4">
            <MessageCircleMore className="h-7 w-7 text-accent" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Selecione um card</h2>
          <p className="mt-2 max-w-xs text-sm text-secondary">
            Abra uma conversa para ver o histórico completo e responder sem sair do pipeline.
          </p>
        </div>
      )}
    </Card>
  );
}
