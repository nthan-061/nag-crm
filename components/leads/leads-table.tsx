"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Users } from "lucide-react";
import { emitLeadDeleted } from "@/lib/lead-events";
import { formatPhone } from "@/lib/utils";
import type { Lead } from "@/lib/types/database";

const ORIGIN_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  manual: "Manual",
  website: "Website",
  api: "API",
};

export function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [deletingLeadIds, setDeletingLeadIds] = useState<Set<string>>(() => new Set());
  const [isPending, startTransition] = useTransition();
  const deletingIds = useRef<Set<string>>(new Set());
  const router = useRouter();

  // Fetch fresh data on mount so navigating to this page always reflects
  // the real DB state, regardless of Next.js client router cache (30s TTL).
  useEffect(() => {
    void syncLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncLeads() {
    try {
      const response = await fetch("/api/leads", { cache: "no-store" });
      if (!response.ok) return;
      const payload = (await response.json()) as { data?: Lead[] };
      if (!Array.isArray(payload.data)) return;
      setLeads(payload.data.filter((lead) => !deletingIds.current.has(lead.id)));
    } catch {
      // Keep current state if fetch fails
    }
  }

  function handleDelete(leadId: string) {
    if (!window.confirm("Tem certeza que deseja apagar este lead? Esta acao remove card e mensagens relacionadas.")) {
      return;
    }

    startTransition(() => {
      void (async () => {
        deletingIds.current.add(leadId);
        setDeletingLeadIds((current) => new Set(current).add(leadId));
        setLeads((current) => current.filter((lead) => lead.id !== leadId));

        const response = await fetch(`/api/leads/${leadId}`, {
          method: "DELETE",
          cache: "no-store"
        });

        if (!response.ok) {
          deletingIds.current.delete(leadId);
          setDeletingLeadIds((current) => {
            const next = new Set(current);
            next.delete(leadId);
            return next;
          });
          await syncLeads();
          router.refresh();
          const payload = (await response.json().catch(() => ({ error: "Nao foi possivel apagar o lead." }))) as {
            error?: string;
          };
          window.alert(payload.error ?? "Nao foi possivel apagar o lead.");
          return;
        }

        emitLeadDeleted(leadId);
        router.refresh();
        setTimeout(() => {
          deletingIds.current.delete(leadId);
          setDeletingLeadIds((current) => {
            const next = new Set(current);
            next.delete(leadId);
            return next;
          });
        }, 3000);
      })();
    });
  }

  return (
    <div className="glass-panel rounded-2xl border border-border/50 shadow-card overflow-hidden">

      {/* ── Header ────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div>
          <p className="label-overline">Contatos</p>
          <h2 className="mt-1 text-lg font-bold tracking-tight text-foreground">
            Base de leads
          </h2>
        </div>
        <span className="flex items-center gap-2 rounded-lg border border-border/60 bg-surface/60 px-3 py-1.5 text-xs text-secondary/80">
          <Users className="h-3.5 w-3.5" />
          {leads.length} {leads.length === 1 ? "lead" : "leads"}
        </span>
      </div>

      {/* ── Table ─────────────────────────────── */}
      {leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/40">
            <Users className="h-5 w-5 text-secondary/40" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground/60">Nenhum lead ainda</p>
          <p className="mt-1 text-xs text-secondary/50">
            Leads criados via webhook ou manualmente aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border/30 text-sm">
            <thead>
              <tr className="bg-surface/30">
                <th className="px-4 py-2.5 text-left">
                  <span className="label-overline">Nome</span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="label-overline">Telefone</span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="label-overline">Origem</span>
                </th>
                <th className="px-4 py-2.5 text-left">
                  <span className="label-overline">Criado em</span>
                </th>
                <th className="px-4 py-2.5 text-right">
                  <span className="label-overline">Acao</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {leads.map((lead) => {
                const isDeleting = deletingLeadIds.has(lead.id);
                return (
                  <tr key={lead.id} className={`group transition-colors hover:bg-accent/[0.035] ${isDeleting ? "opacity-60" : ""}`}>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-foreground">{lead.nome}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-secondary">{formatPhone(lead.telefone)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-border/50 bg-surface/60 px-2 py-0.5 text-xs text-secondary/80">
                        {ORIGIN_LABEL[lead.origem ?? "manual"] ?? (lead.origem ?? "manual")}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-secondary/70 text-xs">
                        {new Date(lead.criado_em).toLocaleString("pt-BR")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        className="text-tertiary opacity-100 transition-all hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                        onClick={() => handleDelete(lead.id)}
                        disabled={isPending || isDeleting}
                        aria-label={`Apagar ${lead.nome}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
