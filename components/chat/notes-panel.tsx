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
  const [error, setError] = useState<string | null>(null);

  const loadNotes = useCallback(async () => {
    try {
      const response = await fetch(`/api/notes/${leadId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { data: LeadNote[] };
      setNotes(payload.data ?? []);
    } catch {
      // Keep current notes visible if load fails
    }
  }, [leadId]);

  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  function handleSave() {
    if (!value.trim()) return;
    const savedValue = value;

    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/notes/${leadId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ leadId, content: savedValue })
        });
        if (!response.ok) {
          setValue(savedValue);
          setError("Nao foi possivel salvar a anotacao. Tente novamente.");
          return;
        }
        setValue("");
        await loadNotes();
      })();
    });
  }

  function handleDelete(noteId: string) {
    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/notes/item/${noteId}`, { method: "DELETE" });
        if (!response.ok) {
          setError("Nao foi possivel remover a anotacao.");
          return;
        }
        await loadNotes();
      })();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="h-[calc(100vh-360px)]">
        <div className="space-y-3 pr-4">
          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
          )}
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
          {notes.length === 0 && !error && (
            <p className="text-sm text-secondary">Nenhuma anotacao ainda.</p>
          )}
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
