"use client";

import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { CrmEvent } from "@/lib/types/database";

export function RecentEventsPanel() {
  const [events, setEvents] = useState<CrmEvent[]>([]);

  useEffect(() => {
    void (async () => {
      const response = await fetch("/api/crm-events", { cache: "no-store" }).catch(() => null);
      if (!response?.ok) return;
      const payload = (await response.json()) as { data?: CrmEvent[] };
      if (Array.isArray(payload.data)) setEvents(payload.data);
    })();
  }, []);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Observabilidade</p>
          <h2 className="mt-1.5 text-xl font-semibold text-foreground">Ultimos eventos</h2>
          <p className="mt-2 text-[13px] text-secondary">
            Registro operacional para investigar webhooks, envios, agendamentos e importacoes.
          </p>
        </div>
        <Activity className="h-5 w-5 text-accent/70" />
      </div>

      <div className="mt-4 space-y-2">
        {events.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-secondary">
            Nenhum evento registrado ainda.
          </p>
        ) : events.slice(0, 8).map((event) => (
          <div key={event.id} className="rounded-xl border border-border/45 bg-surface/40 px-3 py-2 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-foreground">{event.event_type}</span>
              <span className="text-tertiary">{new Date(event.created_at).toLocaleString("pt-BR")}</span>
            </div>
            <p className="mt-1 text-secondary">Fonte: {event.source}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}
