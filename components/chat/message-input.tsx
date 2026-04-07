"use client";

import { useState, useTransition } from "react";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="space-y-3">
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={leadId ? "Responder conversa..." : "Selecione um card para responder"}
        disabled={!leadId || isPending}
      />
      <Button className="w-full" onClick={handleSubmit} disabled={!leadId || !value.trim() || isPending}>
        <SendHorizontal className="mr-2 h-4 w-4" />
        {isPending ? "Enviando..." : "Enviar mensagem"}
      </Button>
    </div>
  );
}
