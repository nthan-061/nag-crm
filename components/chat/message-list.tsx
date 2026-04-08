"use client";

import { useEffect, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database";

export function MessageList({ messages, leadId }: { messages: Message[]; leadId: string | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;
    container.scrollTop = container.scrollHeight;
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
    </div>
  );
}
