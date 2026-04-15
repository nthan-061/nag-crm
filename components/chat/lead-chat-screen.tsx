"use client";

import { ArrowLeft, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChatPanel } from "@/components/chat/chat-panel";
import { NotesPanel } from "@/components/chat/notes-panel";
import { Button } from "@/components/ui/button";
import { emitLeadDeleted } from "@/lib/lead-events";
import { cn } from "@/lib/utils";
import type { KanbanCardRecord } from "@/lib/types/database";

export function LeadChatScreen({
  selectedCard
}: {
  selectedCard: KanbanCardRecord | null;
}) {
  const router = useRouter();
  const [notesOpen, setNotesOpen] = useState(true);

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
      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-3">
        <p className="label-overline">Conversa do pipeline</p>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="gap-2"
          onClick={() => router.push("/pipeline")}
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao pipeline
        </Button>
      </div>

      <div
        className={cn(
          "grid min-h-0 flex-1 gap-2.5 transition-all duration-200",
          notesOpen ? "xl:grid-cols-[minmax(0,1fr)_260px]" : "xl:grid-cols-[minmax(0,1fr)]"
        )}
      >
        <ChatPanel
          selectedCard={selectedCard}
          onDeleteLead={handleDeleteLead}
          className="min-h-0"
          showTabs={false}
          showDeleteAction={false}
          headerActions={
            selectedCard ? (
              <button
                type="button"
                className="flex h-8 items-center gap-1.5 rounded-lg border border-border/60 bg-surface/60 px-2.5 text-[11px] font-semibold text-secondary transition hover:bg-accent/[0.07] hover:text-foreground"
                onClick={() => setNotesOpen((current) => !current)}
                aria-label={notesOpen ? "Recolher anotacoes" : "Expandir anotacoes"}
              >
                {notesOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
                {notesOpen ? "Ocultar notas" : "Notas"}
              </button>
            ) : null
          }
        />

        {notesOpen && selectedCard ? (
          <aside className="glass-panel hidden min-h-0 overflow-hidden rounded-2xl border border-border/60 shadow-card transition-all duration-200 xl:flex xl:flex-col">
            <div className="flex items-center justify-between border-b border-border/40 px-3 py-3">
              <div>
                <p className="label-overline">Anotacoes</p>
                <h2 className="mt-1 text-sm font-bold text-foreground">{selectedCard.lead_nome}</h2>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-secondary transition hover:bg-accent/[0.06] hover:text-foreground"
                onClick={() => setNotesOpen(false)}
                aria-label="Recolher anotacoes"
              >
                <PanelRightClose className="h-4 w-4" />
              </button>
            </div>
            <NotesPanel leadId={selectedCard.lead_id} />
          </aside>
        ) : null}
      </div>
    </section>
  );
}
