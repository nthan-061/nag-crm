"use client";

import { ArrowLeft, PanelLeftClose } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChatPanel } from "@/components/chat/chat-panel";
import { Button } from "@/components/ui/button";
import { emitLeadDeleted } from "@/lib/lead-events";
import type { KanbanCardRecord } from "@/lib/types/database";

export function LeadChatScreen({
  selectedCard
}: {
  selectedCard: KanbanCardRecord | null;
}) {
  const router = useRouter();

  async function handleDeleteLead(leadId: string) {
    const leadName = selectedCard?.lead_nome ?? "este lead";
    if (!window.confirm(`Tem certeza que deseja apagar ${leadName}? Esta acao remove card e mensagens relacionadas.`)) {
      return;
    }

    const response = await fetch(`/api/leads/${leadId}`, {
      method: "DELETE",
      cache: "no-store"
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => ({ error: "Nao foi possivel apagar o lead." }))) as {
        error?: string;
      };
      window.alert(payload.error ?? "Nao foi possivel apagar o lead.");
      return;
    }

    emitLeadDeleted(leadId);
    router.push("/pipeline");
  }

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="label-overline">Conversa do pipeline</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
            {selectedCard?.lead_nome ?? "Conversa nao encontrada"}
          </h1>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="gap-2"
          onClick={() => router.push("/pipeline")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao pipeline
        </Button>
      </div>

      <ChatPanel
        selectedCard={selectedCard}
        onDeleteLead={handleDeleteLead}
        className="min-h-0 flex-1"
        headerActions={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-[11px]"
            onClick={() => router.push("/pipeline")}
          >
            <PanelLeftClose className="h-3.5 w-3.5" />
            Fechar
          </Button>
        }
      />
    </section>
  );
}
