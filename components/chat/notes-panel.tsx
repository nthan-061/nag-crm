"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Trash2, StickyNote } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
    setValue("");
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
    <div className="flex h-full flex-col overflow-hidden">

      {/* ── Notes list ─────────────────────────── */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-2.5 px-4 py-4">
          {error && (
            <p className="rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-xs text-danger">{error}</p>
          )}

          {notes.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-surface/40">
                <StickyNote className="h-4 w-4 text-secondary/40" />
              </div>
              <p className="mt-3 text-xs text-secondary/50">Nenhuma anotacao ainda.</p>
            </div>
          )}

          {notes.map((note) => (
            <div key={note.id} className="group rounded-xl border border-border/40 bg-surface/40 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <p className="whitespace-pre-wrap text-sm text-foreground leading-relaxed flex-1">{note.conteudo}</p>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  disabled={isPending}
                  className="mt-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 text-tertiary transition-all hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2.5 text-[10px] text-tertiary">
                {new Date(note.timestamp).toLocaleString("pt-BR")}
              </p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* ── Editor ─────────────────────────────── */}
      <div className="border-t border-border/40 px-4 py-3 space-y-2.5">
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && event.ctrlKey) {
              event.preventDefault();
              handleSave();
            }
          }}
          placeholder="Escreva uma anotacao... (Ctrl+Enter para salvar)"
          disabled={isPending}
          className="min-h-[80px] resize-none text-xs"
        />
        <Button
          onClick={handleSave}
          disabled={!value.trim() || isPending}
          className="w-full"
          size="sm"
        >
          {isPending ? "Salvando..." : "Salvar anotacao"}
        </Button>
      </div>
    </div>
  );
}
