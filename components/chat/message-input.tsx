"use client";

import { useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function MessageInput({
  leadId,
  onSent
}: {
  leadId: string | null;
  onSent: () => Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  async function handleSubmit() {
    if (!leadId || !value.trim()) return;

    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/messages/send", {
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
        await onSent();
      })();
    });
  }

  return (
    <div className="relative">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder={leadId ? "Mensagem... (Enter para enviar)" : "Selecione um lead"}
        disabled={!leadId || isPending}
        className="min-h-[80px] resize-none pr-12"
      />
      <button
        type="button"
        onClick={() => void handleSubmit()}
        disabled={!leadId || !value.trim() || isPending}
        className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white transition-all hover:bg-accent/90 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        <SendHorizontal className="h-4 w-4" />
      </button>
    </div>
  );
}
