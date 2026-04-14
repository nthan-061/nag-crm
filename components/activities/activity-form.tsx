"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ActivityPriority, ActivityStatus, ActivityLead, ActivityWithLead } from "@/lib/types/database";

export interface ActivityFormValues {
  title: string;
  description: string;
  status: ActivityStatus;
  priority: ActivityPriority;
  due_date: string | null;
  lead_id: string | null;
}

function toInputDate(value: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}

export function ActivityForm({
  activity,
  leads,
  onSubmit,
  onCancel,
  saving
}: {
  activity: ActivityWithLead | null;
  leads: ActivityLead[];
  onSubmit: (values: ActivityFormValues) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const initialValues = useMemo<ActivityFormValues>(
    () => ({
      title: activity?.title ?? "",
      description: activity?.description ?? "",
      status: activity?.status ?? "todo",
      priority: activity?.priority ?? "medium",
      due_date: toInputDate(activity?.due_date ?? null),
      lead_id: activity?.lead_id ?? null
    }),
    [activity]
  );
  const [values, setValues] = useState(initialValues);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValues(initialValues);
    setError(null);
  }, [initialValues]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (values.title.trim().length < 2) {
      setError("Informe um titulo com pelo menos 2 caracteres.");
      return;
    }

    await onSubmit({
      ...values,
      title: values.title.trim(),
      description: values.description.trim(),
      due_date: values.due_date ? new Date(`${values.due_date}T12:00:00`).toISOString() : null,
      lead_id: values.lead_id || null
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="mb-1.5 block text-xs font-semibold text-secondary">Titulo</label>
        <Input
          value={values.title}
          onChange={(event) => setValues((current) => ({ ...current, title: event.target.value }))}
          placeholder="Montar cotacao da Sandra"
          maxLength={140}
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-secondary">Descricao</label>
        <Textarea
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder="Detalhes, contexto e proximos passos"
          maxLength={2000}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-secondary">Status</label>
          <select
            className="h-11 w-full rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-accent"
            value={values.status}
            onChange={(event) => setValues((current) => ({ ...current, status: event.target.value as ActivityStatus }))}
          >
            <option value="todo">A fazer</option>
            <option value="doing">Fazendo</option>
            <option value="done">Concluido</option>
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-secondary">Prioridade</label>
          <select
            className="h-11 w-full rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-accent"
            value={values.priority}
            onChange={(event) => setValues((current) => ({ ...current, priority: event.target.value as ActivityPriority }))}
          >
            <option value="low">Baixa</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-secondary">Vencimento</label>
          <Input
            type="date"
            value={values.due_date ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, due_date: event.target.value || null }))}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-secondary">Lead vinculado</label>
          <select
            className="h-11 w-full rounded-2xl border border-border bg-background/60 px-4 text-sm text-foreground outline-none transition focus:border-accent"
            value={values.lead_id ?? ""}
            onChange={(event) => setValues((current) => ({ ...current, lead_id: event.target.value || null }))}
          >
            <option value="">Sem lead</option>
            {leads.map((lead) => (
              <option key={lead.id} value={lead.id}>
                {lead.nome} - {lead.telefone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className="rounded-xl border border-danger/25 bg-danger/[0.08] px-3 py-2 text-xs text-danger">{error}</p>}

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando..." : activity ? "Salvar atividade" : "Criar atividade"}
        </Button>
      </div>
    </form>
  );
}
