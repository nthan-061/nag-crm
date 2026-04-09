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

  if (messages.length === 0) {
    return (
      <div ref={containerRef} className="flex flex-1 items-center justify-center text-center p-6">
        <div>
          <p className="text-sm text-secondary/50">Nenhuma mensagem ainda.</p>
          <p className="mt-1 text-xs text-tertiary">Envie a primeira mensagem abaixo.</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 min-h-0">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex flex-col max-w-[82%]",
            message.tipo === "saida" ? "ml-auto items-end" : "items-start"
          )}
        >
          <div
            className={cn(
              "rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              message.tipo === "saida"
                ? "rounded-br-sm bg-accent text-white"
                : "rounded-bl-sm bg-surface border border-border/50 text-foreground"
            )}
          >
            <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>
          </div>
          <p className={cn(
            "mt-1 px-1 text-[10px]",
            message.tipo === "saida" ? "text-secondary/50" : "text-tertiary"
          )}>
            {format(new Date(message.timestamp), "HH:mm • dd/MM", { locale: ptBR })}
          </p>
        </div>
      ))}
    </div>
  );
}
