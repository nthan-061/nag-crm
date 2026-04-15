import { AppFrame } from "@/components/layout/app-frame";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatPhone, formatRelativeTime } from "@/lib/utils";
import { BarChart3, TrendingUp, Zap, MessageSquare } from "lucide-react";
import type { DashboardData } from "@/lib/types/database";

export function DashboardOverview({ data }: { data: DashboardData }) {
  const totalLeads = data.cards.length;
  const newLeads = data.cards.filter((card) => card.coluna_id === data.columns[0]?.id).length;
  const highPriority = data.cards.filter((card) => card.prioridade === "alta").length;
  const withoutMessage = data.cards.filter((card) => !card.ultima_mensagem).length;
  const latestCards = [...data.cards]
    .sort((a, b) => {
      if (!a.ultima_interacao) return 1;
      if (!b.ultima_interacao) return -1;
      return new Date(b.ultima_interacao).getTime() - new Date(a.ultima_interacao).getTime();
    })
    .slice(0, 8);

  return (
    <AppFrame>
      <div className="space-y-4">

        {/* ── Page header ──────────────────────────────── */}
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="label-overline">Dashboard</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-foreground md:text-2xl">
              Visão operacional
            </h2>
            <p className="mt-1 text-[13px] text-secondary">
              Volume de leads, fila de entrada e atividade recente do CRM.
            </p>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-border/60 bg-card px-3.5 py-2 text-xs text-secondary md:flex">
            <div className="h-1.5 w-1.5 rounded-full bg-success live-dot" />
            <span>Ao vivo</span>
          </div>
        </div>

        {/* ── KPI grid ─────────────────────────────────── */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Leads ativos"
            value={String(totalLeads)}
            helper="Total de cards visíveis no pipeline comercial."
            icon={<BarChart3 className="h-4 w-4" />}
            accent
          />
          <SummaryCard
            label="Entrada de lead"
            value={String(newLeads)}
            helper="Contatos aguardando qualificação na primeira etapa."
            icon={<TrendingUp className="h-4 w-4" />}
          />
          <SummaryCard
            label="Alta prioridade"
            value={String(highPriority)}
            helper="Leads marcados como alta prioridade no pipeline."
            icon={<Zap className="h-4 w-4" />}
          />
          <SummaryCard
            label="Sem mensagem"
            value={String(withoutMessage)}
            helper="Leads que ainda não receberam nenhuma mensagem."
            icon={<MessageSquare className="h-4 w-4" />}
          />
        </div>

        {/* ── Activity feed ────────────────────────────── */}
        <div className="glass-panel rounded-2xl border border-border/60 shadow-card overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div>
              <p className="label-overline">Atividade recente</p>
              <p className="mt-1 text-[13px] font-medium text-foreground">
                Últimas interações no pipeline
              </p>
            </div>
            <span className="rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1 text-xs text-secondary">
              {latestCards.length} registros
            </span>
          </div>

          {latestCards.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/60 bg-surface/40">
                <BarChart3 className="h-5 w-5 text-secondary/50" />
              </div>
              <p className="mt-4 text-sm font-medium text-foreground/60">Sem atividade ainda</p>
              <p className="mt-1 text-xs text-secondary/50">
                Os leads aparecerão aqui conforme interações ocorrerem.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border/40 text-sm">
                <thead>
                  <tr className="bg-surface/30">
                    <th className="px-4 py-2.5 text-left">
                      <span className="label-overline">Lead</span>
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <span className="label-overline">Telefone</span>
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <span className="label-overline">Última mensagem</span>
                    </th>
                    <th className="px-4 py-2.5 text-left">
                      <span className="label-overline">Atualização</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {latestCards.map((card, i) => (
                    <tr
                      key={card.card_id}
                      className="group transition-colors hover:bg-accent/[0.035]"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">{card.lead_nome}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-secondary">
                          {formatPhone(card.lead_telefone)}
                        </span>
                      </td>
                      <td className="max-w-[280px] px-4 py-3">
                        <span className="block truncate text-secondary">
                          {card.ultima_mensagem ?? (
                            <span className="text-tertiary italic">Sem mensagens</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-secondary/70">{formatRelativeTime(card.ultima_interacao)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppFrame>
  );
}
