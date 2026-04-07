import { AppFrame } from "@/components/layout/app-frame";
import { Card } from "@/components/ui/card";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatPhone, formatRelativeTime } from "@/lib/utils";
import type { DashboardData } from "@/lib/types/database";

export function DashboardOverview({ data }: { data: DashboardData }) {
  const totalLeads = data.cards.length;
  const newLeads = data.cards.filter((card) => card.coluna_id === data.columns[0]?.id).length;
  const activeColumns = data.columns.length;
  const latestCards = data.cards.slice(0, 5);

  return (
    <AppFrame>
      <div className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Dashboard</p>
          <h2 className="mt-2 text-3xl font-semibold text-foreground">Visao operacional</h2>
          <p className="mt-2 text-sm text-secondary">
            Acompanhe volume de leads, fila de entrada e atividade recente do CRM.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard
            label="Leads ativos"
            value={String(totalLeads)}
            helper="Total de cards visiveis no pipeline comercial."
          />
          <SummaryCard
            label="Entrada de lead"
            value={String(newLeads)}
            helper="Contatos aguardando qualificacao na primeira coluna."
          />
          <SummaryCard
            label="Etapas"
            value={String(activeColumns)}
            helper="Colunas dinamicas do pipeline configurado."
          />
        </div>

        <Card className="p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-accent">Atividade recente</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-border">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-white/5 text-left text-secondary">
                <tr>
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Ultima mensagem</th>
                  <th className="px-4 py-3 font-medium">Atualizacao</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {latestCards.map((card) => (
                  <tr key={card.card_id}>
                    <td className="px-4 py-3 text-foreground">{card.lead_nome}</td>
                    <td className="px-4 py-3 text-secondary">{formatPhone(card.lead_telefone)}</td>
                    <td className="px-4 py-3 text-secondary">{card.ultima_mensagem ?? "Sem mensagens"}</td>
                    <td className="px-4 py-3 text-secondary">{formatRelativeTime(card.ultima_interacao)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppFrame>
  );
}
