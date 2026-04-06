"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database";

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <ScrollArea className="h-[calc(100vh-270px)]">
      <div className="flex flex-col gap-3 pr-4">
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
    </ScrollArea>
  );
}
