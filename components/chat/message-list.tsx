"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database";

// Distance from the bottom (px) within which the user is considered "near the end".
// Scroll auto-follow only happens when the user is within this margin.
const NEAR_BOTTOM_THRESHOLD = 150;

export type MessageListHandle = {
  /** Force scroll to bottom and re-enable auto-follow (call after sending a message). */
  scrollToBottom: () => void;
};

export const MessageList = forwardRef<
  MessageListHandle,
  { messages: Message[]; leadId: string | null }
>(function MessageList({ messages, leadId }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tracks whether the user is close to the bottom of the conversation.
  // Use a ref so the scroll listener always reads the latest value without
  // triggering re-renders.
  const isNearBottomRef = useRef(true);

  // The last message ID we scrolled to. When a new ID appears at the tail of
  // the list AND the user is near the bottom, we scroll. Polling that returns
  // the same messages therefore never triggers an unwanted scroll.
  const lastScrolledMessageIdRef = useRef<string | null>(null);

  // Expose scrollToBottom so the parent can force-scroll after sending.
  useImperativeHandle(ref, () => ({
    scrollToBottom() {
      isNearBottomRef.current = true;
      const container = containerRef.current;
      if (container) container.scrollTop = container.scrollHeight;
    }
  }));

  // Listen to scroll events to keep isNearBottomRef accurate.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleScroll() {
      const { scrollTop, scrollHeight, clientHeight } = container!;
      isNearBottomRef.current = scrollHeight - scrollTop - clientHeight <= NEAR_BOTTOM_THRESHOLD;
    }

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // When the conversation switches (leadId changes), reset scroll state so the
  // first batch of messages for the new lead always lands at the bottom.
  useEffect(() => {
    isNearBottomRef.current = true;
    lastScrolledMessageIdRef.current = null;
  }, [leadId]);

  // Smart auto-scroll: runs whenever the message list updates.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isNewLastMessage = lastMessage.id !== lastScrolledMessageIdRef.current;

    if (!isNewLastMessage) {
      // Same tail as before — just a re-render or middle-of-list update.
      // Never disturb the user's scroll position.
      return;
    }

    // Record that we've processed this message.
    lastScrolledMessageIdRef.current = lastMessage.id;

    if (isNearBottomRef.current) {
      // User is near the bottom (or this is the first load for this lead):
      // follow the conversation.
      container.scrollTop = container.scrollHeight;
    }
    // If the user scrolled up to read history, do nothing — let them read.
  }, [messages]);

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
});
