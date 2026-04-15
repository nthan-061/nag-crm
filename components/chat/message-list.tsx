"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Download, ExternalLink, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Message } from "@/lib/types/database";

// Distance from the bottom (px) within which the user is considered "near the end".
// Scroll auto-follow only happens when the user is within this margin.
const NEAR_BOTTOM_THRESHOLD = 150;

export type MessageListHandle = {
  /** Force scroll to bottom and re-enable auto-follow (call after sending a message). */
  scrollToBottom: () => void;
};

function isPlaceholder(value: string) {
  return [
    "[Imagem recebida]",
    "[Audio recebido]",
    "[Video recebido]",
    "[Documento recebido]",
    "[Imagem enviada]",
    "[Audio enviado]",
    "[Video enviado]",
    "[Documento enviado]"
  ].includes(value);
}

function formatFileSize(size: number | null) {
  if (!size || size <= 0) return null;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function shouldShowCaption(message: Message) {
  if (!message.conteudo || isPlaceholder(message.conteudo)) return false;
  if (message.media_file_name && message.conteudo === message.media_file_name) return false;
  return true;
}

function MediaUnavailable({ type }: { type: "image" | "audio" | "video" | "document" }) {
  const label = {
    image: "Imagem indisponivel no momento.",
    audio: "Audio indisponivel no momento.",
    video: "Video indisponivel no momento.",
    document: "Documento indisponivel no momento."
  }[type];

  return (
    <div className="rounded-xl border border-dashed border-border/60 bg-muted/50 px-3 py-3 text-xs text-secondary">
      {label}
    </div>
  );
}

function ImageMessage({ message }: { message: Message }) {
  const [failed, setFailed] = useState(false);
  if (!message.media_storage_path || failed) return <MediaUnavailable type="image" />;

  return (
    <a href={`/api/messages/media/${message.id}`} target="_blank" rel="noreferrer" className="block">
      {/* Signed media is served by an API route, so a plain img keeps auth and refresh behavior predictable. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/messages/media/${message.id}`}
        alt={message.conteudo && !isPlaceholder(message.conteudo) ? message.conteudo : "Imagem recebida"}
        loading="lazy"
        className="max-h-[360px] w-full max-w-[320px] rounded-xl border border-border/50 object-contain"
        onError={() => setFailed(true)}
      />
    </a>
  );
}

function AudioMessage({ message }: { message: Message }) {
  if (!message.media_storage_path) return <MediaUnavailable type="audio" />;

  return (
    <div className="min-w-[240px]">
      <audio
        controls
        preload="metadata"
        src={`/api/messages/media/${message.id}`}
        className="w-full"
      />
      {message.media_duration_seconds ? (
        <p className="mt-1 text-[10px] text-secondary/70">{message.media_duration_seconds}s</p>
      ) : null}
    </div>
  );
}

function VideoMessage({ message }: { message: Message }) {
  if (!message.media_storage_path) return <MediaUnavailable type="video" />;

  return (
    <div className="w-full max-w-[320px] overflow-hidden rounded-xl border border-border/50 bg-black/40">
      <video
        controls
        preload="metadata"
        src={`/api/messages/media/${message.id}`}
        className="max-h-[360px] w-full object-contain"
      />
      {message.media_duration_seconds ? (
        <p className="px-3 pb-2 text-[10px] text-secondary/70">{message.media_duration_seconds}s</p>
      ) : null}
    </div>
  );
}

function DocumentMessage({ message }: { message: Message }) {
  if (!message.media_storage_path) return <MediaUnavailable type="document" />;

  const fileName = message.media_file_name ?? (isPlaceholder(message.conteudo) ? "Documento recebido" : message.conteudo);
  const fileSize = formatFileSize(message.media_size);
  const mediaUrl = `/api/messages/media/${message.id}`;

  return (
    <div className="w-full min-w-[240px] max-w-[340px] rounded-xl border border-border/50 bg-background/70 p-3 text-foreground shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{fileName}</p>
          <p className="mt-0.5 text-[11px] text-secondary">
            {[message.media_mime_type, fileSize].filter(Boolean).join(" | ") || "Arquivo"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <a
          href={mediaUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Abrir
        </a>
        <a
          href={`${mediaUrl}?download=1`}
          download={fileName}
          className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
        >
          <Download className="h-3.5 w-3.5" />
          Baixar
        </a>
      </div>
    </div>
  );
}

function MessageBody({ message }: { message: Message }) {
  if (message.media_type === "image") {
    return (
      <div className="space-y-2">
        <ImageMessage message={message} />
        {shouldShowCaption(message) ? (
          <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>
        ) : null}
      </div>
    );
  }

  if (message.media_type === "audio") {
    return (
      <div className="space-y-2">
        <AudioMessage message={message} />
        {shouldShowCaption(message) ? (
          <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>
        ) : null}
      </div>
    );
  }

  if (message.media_type === "video") {
    return (
      <div className="space-y-2">
        <VideoMessage message={message} />
        {shouldShowCaption(message) ? (
          <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>
        ) : null}
      </div>
    );
  }

  if (message.media_type === "document") {
    return (
      <div className="space-y-2">
        <DocumentMessage message={message} />
        {shouldShowCaption(message) ? (
          <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>
        ) : null}
      </div>
    );
  }

  return <p className="whitespace-pre-wrap break-words">{message.conteudo}</p>;
}

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
    <div ref={containerRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto px-3.5 py-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex max-w-[78%] flex-col transition-transform duration-150",
            message.tipo === "saida" ? "ml-auto items-end" : "items-start"
          )}
        >
          <div
            className={cn(
              "rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm",
              message.tipo === "saida"
                ? "rounded-br-sm bg-accent text-white"
                : "rounded-bl-sm bg-surface border border-border/50 text-foreground"
            )}
          >
            <MessageBody message={message} />
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
