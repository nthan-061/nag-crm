"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database";

export function MessageList({ messages, leadId }: { messages: Message[]; leadId: string | null }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prevLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const leadChanged = prevLeadIdRef.current !== leadId;
    prevLeadIdRef.current = leadId;

    if (leadChanged) {
      // Hard scroll to bottom on lead switch — no animation to avoid flicker
      container.scrollTop = container.scrollHeight;
    } else {
      // Stick to bottom only if already near bottom (user hasn't scrolled up)
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      if (distanceFromBottom < 80) {
        bottomRef.current?.scrollIntoView({ block: "end" });
      }
    }
  }, [messages, leadId]);

  return (
    <div ref={containerRef} className="h-[calc(100vh-270px)] overflow-y-auto pr-4">
      <div className="flex flex-col gap-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "max-w-[86%] rounded-[22px] px-4 py-3 text-sm shadow-premium",
              message.tipo === "saida" ? "ml-auto bg-accent text-white" : "bg-card text-foreground"
            )}
          >
            <p>{message.conteudo}</p>
            <p className={cn("mt-2 text-[11px]", message.tipo === "saida" ? "text-white/70" : "text-secondary")}>
              {format(new Date(message.timestamp), "HH:mm • dd/MM", { locale: ptBR })}
            </p>
          </div>
        ))}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
