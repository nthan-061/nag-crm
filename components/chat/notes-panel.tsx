"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import type { LeadNote } from "@/lib/types/database";

export function NotesPanel({ leadId }: { leadId: string }) {
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [value, setValue] = useState("");
  const [isPending, startTransition] = useTransition();

  const loadNotes = useCallback(async () => {
    const response = await fetch(`/api/notes/${leadId}`);
    const payload = (await response.json()) as { data: LeadNote[] };
    setNotes(payload.data ?? []);
  }, [leadId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  function handleSave() {
    if (!value.trim()) return;

    startTransition(() => {
      void (async () => {
        await fetch(`/api/notes/${leadId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, content: value })
        });
        setValue("");
        await loadNotes();
      })();
    });
  }

  function handleDelete(noteId: string) {
    startTransition(() => {
      void (async () => {
        await fetch(`/api/notes/item/${noteId}`, { method: "DELETE" });
        await loadNotes();
      })();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-3 pr-4">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-border bg-background/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{note.conteudo}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  className="text-secondary transition hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-xs text-secondary">
                {new Date(note.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
          {notes.length === 0 && <p className="text-sm text-secondary">Nenhuma anotacao ainda.</p>}
        </div>
      </ScrollArea>

      <div className="mt-5 space-y-3">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Escreva uma anotacao interna sobre este lead..."
          disabled={isPending}
        />
        <Button onClick={handleSave} disabled={!value.trim() || isPending} className="w-full">
          {isPending ? "Salvando..." : "Salvar anotacao"}
        </Button>
      </div>
    </div>
  );
}
