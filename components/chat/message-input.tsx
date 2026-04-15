"use client";

import { ChangeEvent, useRef, useState, useTransition } from "react";
import { Paperclip, SendHorizontal, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const ACCEPTED_MEDIA_TYPES = [
  "image/*",
  "audio/*",
  "video/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain"
].join(",");

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function MessageInput({
  leadId,
  onSent
}: {
  leadId: string | null;
  onSent: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setSelectedFile(event.target.files?.[0] ?? null);
  }

  function clearSelectedFile() {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!leadId || (!value.trim() && !selectedFile)) return;

    startTransition(() => {
      void (async () => {
        const response = selectedFile
          ? await sendMedia()
          : await fetch("/api/messages/send", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ leadId, content: value })
            });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ error: "Falha ao enviar mensagem" }))) as {
            error?: string;
          };
          window.alert(payload.error ?? "Falha ao enviar mensagem");
          return;
        }

        setValue("");
        clearSelectedFile();
        await onSent();
      })();
    });
  }

  async function sendMedia() {
    if (!leadId || !selectedFile) throw new Error("Arquivo nao selecionado");
    const formData = new FormData();
    formData.append("leadId", leadId);
    formData.append("file", selectedFile);
    formData.append("caption", value.trim());

    return fetch("/api/messages/send-media", {
      method: "POST",
      body: formData
    });
  }

  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_MEDIA_TYPES}
        className="hidden"
        onChange={handleFileChange}
        disabled={!leadId || isPending}
      />
      {selectedFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-secondary">
          <div className="min-w-0">
            <p className="truncate font-medium text-foreground">{selectedFile.name}</p>
            <p>{selectedFile.type || "Arquivo"} | {formatFileSize(selectedFile.size)}</p>
          </div>
          <button
            type="button"
            onClick={clearSelectedFile}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border text-secondary transition-colors hover:bg-muted"
            aria-label="Remover anexo"
            disabled={isPending}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}
      <div className="relative">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={!leadId || isPending}
          className="absolute bottom-3 left-3 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Anexar arquivo"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSubmit();
            }
          }}
          placeholder={
            leadId
              ? selectedFile
                ? "Legenda opcional... (Enter para enviar)"
                : "Mensagem... (Enter para enviar)"
              : "Selecione um lead"
          }
          disabled={!leadId || isPending}
          className="min-h-[80px] resize-none pl-12 pr-12"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!leadId || (!value.trim() && !selectedFile) || isPending}
          className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white transition-all hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <SendHorizontal className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
