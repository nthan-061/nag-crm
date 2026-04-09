"use client";

import { useEffect, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Column } from "@/lib/types/database";

export function ColumnManager({
  columns,
  onUpdated
}: {
  columns: Column[];
  onUpdated: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState(
    columns.map((column) => ({
      id: column.id,
      nome: column.nome,
      cor: column.cor ?? "#3B82F6"
    }))
  );
  const [newColumn, setNewColumn] = useState({ nome: "", cor: "#3B82F6" });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts(
      columns.map((column) => ({
        id: column.id,
        nome: column.nome,
        cor: column.cor ?? "#3B82F6"
      }))
    );
  }, [columns]);

  function updateDraft(id: string, key: "nome" | "cor", value: string) {
    setDrafts((current) => current.map((draft) => (draft.id === id ? { ...draft, [key]: value } : draft)));
  }

  function handleSave(id: string) {
    const draft = drafts.find((item) => item.id === id);
    if (!draft) return;

    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/columns/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: draft.nome, cor: draft.cor })
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Nao foi possivel salvar a coluna.");
          return;
        }
        await onUpdated();
      })();
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Tem certeza que deseja apagar esta coluna? Ela precisa estar vazia para ser removida.")) {
      return;
    }

    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/columns/${id}`, { method: "DELETE" });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ error: "Nao foi possivel apagar a coluna." }))) as {
            error?: string;
          };
          setError(payload.error ?? "Nao foi possivel apagar a coluna.");
          return;
        }
        await onUpdated();
      })();
    });
  }

  function handleCreate() {
    if (!newColumn.nome.trim()) return;

    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newColumn)
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Nao foi possivel criar a coluna.");
          return;
        }
        setNewColumn({ nome: "", cor: "#3B82F6" });
        await onUpdated();
      })();
    });
  }

  function handleMove(index: number, direction: "left" | "right") {
    const targetIndex = direction === "left" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= drafts.length) return;

    // Optimistically reorder the local draft list
    const reordered = [...drafts];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setDrafts(reordered);

    const orderedIds = reordered.map((d) => d.id);

    setError(null);
    startTransition(() => {
      void (async () => {
        const response = await fetch("/api/columns/reorder", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds })
        });
        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          setError(payload.error ?? "Nao foi possivel reordenar as colunas.");
          // Revert optimistic update by syncing from server
          await onUpdated();
          return;
        }
        await onUpdated();
      })();
    });
  }

  return (
    <Card className="mb-4 p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Colunas</p>
          <h3 className="mt-1 text-lg font-semibold text-foreground">Editar pipeline</h3>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-danger/20 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
      )}

      <div className="space-y-3">
        {drafts.map((draft, index) => (
          <div key={draft.id} className="grid gap-3 rounded-2xl border border-border p-3 md:grid-cols-[48px_48px_1fr_120px_140px_48px]">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMove(index, "left")}
              disabled={isPending || index === 0}
              title="Mover para esquerda"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleMove(index, "right")}
              disabled={isPending || index === drafts.length - 1}
              title="Mover para direita"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Input value={draft.nome} onChange={(e) => updateDraft(draft.id, "nome", e.target.value)} />
            <Input value={draft.cor} onChange={(e) => updateDraft(draft.id, "cor", e.target.value)} />
            <Button variant="secondary" onClick={() => handleSave(draft.id)} disabled={isPending}>
              Salvar
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(draft.id)} disabled={isPending}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}

        <div className="grid gap-3 rounded-2xl border border-dashed border-border p-3 md:grid-cols-[1fr_120px_140px]">
          <Input
            placeholder="Nova coluna"
            value={newColumn.nome}
            onChange={(e) => setNewColumn((current) => ({ ...current, nome: e.target.value }))}
          />
          <Input
            value={newColumn.cor}
            onChange={(e) => setNewColumn((current) => ({ ...current, cor: e.target.value }))}
          />
          <Button onClick={handleCreate} disabled={isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Adicionar
          </Button>
        </div>
      </div>
    </Card>
  );
}
