"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatPhone } from "@/lib/utils";
import type { Lead } from "@/lib/types/database";

export function LeadsTable({ initialLeads }: { initialLeads: Lead[] }) {
  const [leads, setLeads] = useState(initialLeads);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function syncLeads() {
    try {
      const response = await fetch("/api/leads", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: Lead[] };
      if (Array.isArray(payload.data)) {
        setLeads(payload.data);
      }
    } catch {
      // Keep the current table visible if background sync fails.
    }
  }

  useEffect(() => {
    void syncLeads();
  }, []);

  function handleDelete(leadId: string) {
    if (!window.confirm("Tem certeza que deseja apagar este lead? Esta acao remove card e mensagens relacionadas.")) {
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/leads/${leadId}`, {
          method: "DELETE",
          cache: "no-store"
        });

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({ error: "Nao foi possivel apagar o lead." }))) as {
            error?: string;
          };
          await syncLeads();
          router.refresh();
          window.alert(payload.error ?? "Nao foi possivel apagar o lead.");
          return;
        }

        setLeads((current) => current.filter((lead) => lead.id !== leadId));
        router.refresh();
      })();
    });
  }

  return (
    <Card className="p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-accent">Leads</p>
      <h2 className="mt-2 text-3xl font-semibold text-foreground">Base de contatos</h2>
      <div className="mt-6 overflow-hidden rounded-2xl border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-white/5 text-left text-secondary">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">Origem</th>
              <th className="px-4 py-3 font-medium">Criado em</th>
              <th className="px-4 py-3 font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {leads.map((lead) => (
              <tr key={lead.id} className="text-foreground/90">
                <td className="px-4 py-3">{lead.nome}</td>
                <td className="px-4 py-3">{formatPhone(lead.telefone)}</td>
                <td className="px-4 py-3">{lead.origem ?? "manual"}</td>
                <td className="px-4 py-3">{new Date(lead.criado_em).toLocaleString("pt-BR")}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="text-secondary transition hover:text-danger"
                    onClick={() => handleDelete(lead.id)}
                    disabled={isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
