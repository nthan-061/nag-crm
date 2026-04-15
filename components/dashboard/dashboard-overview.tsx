import { AppFrame } from "@/components/layout/app-frame";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { formatPhone, formatRelativeTime } from "@/lib/utils";
import { BarChart3, CalendarClock, MessageSquare, Reply, Timer, TrendingUp, Zap } from "lucide-react";
import type { DashboardData } from "@/lib/types/database";

export function DashboardOverview({ data }: { data: DashboardData }) {
  const totalLeads = data.cards.length;
  const newLeads = data.cards.filter((card) => card.coluna_id === data.columns[0]?.id).length;
  const highPriority = data.cards.filter((card) => card.prioridade === "alta").length;
  const withoutMessage = data.cards.filter((card) => !card.ultima_mensagem).length;
  const needsResponse = data.metrics?.needsResponse ?? data.cards.filter((card) => card.needs_response).length;
  const stale24h = data.metrics?.stale24h ?? data.cards.filter((card) => card.needs_response && card.sla_bucket !== "none").length;
  const responseQueue = data.cards.filter((card) => card.needs_response).slice(0, 6);
  const scheduledToday = data.scheduledToday ?? [];
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

        <div className="grid gap-3 lg:grid-cols-3">
          <SummaryCard
            label="Preciso responder"
            value={String(needsResponse)}
            helper="Leads cuja ultima mensagem veio do cliente."
            icon={<Reply className="h-4 w-4" />}
            accent={needsResponse > 0}
          />
          <SummaryCard
            label="Sem resposta 24h+"
            value={String(stale24h)}
            helper="Conversas acima do primeiro limite operacional."
            icon={<Timer className="h-4 w-4" />}
          />
          <SummaryCard
            label="Programadas hoje"
            value={String(scheduledToday.length)}
            helper="Mensagens pendentes ou em processamento para hoje."
            icon={<CalendarClock className="h-4 w-4" />}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <div className="glass-panel rounded-2xl border border-border/60 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-overline">Fila de resposta</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Leads que precisam de retorno</p>
              </div>
              <span className="rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1 text-xs text-secondary">
                {responseQueue.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {responseQueue.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-5 text-center text-sm text-secondary">
                  Nenhum lead aguardando resposta agora.
                </p>
              ) : (
                responseQueue.map((card) => (
                  <div key={card.card_id} className="rounded-xl border border-border/60 bg-card px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{card.lead_nome}</p>
                        <p className="truncate text-xs text-secondary">{card.ultima_mensagem}</p>
                      </div>
                      <span className="shrink-0 rounded-md border border-danger/20 bg-danger/[0.08] px-2 py-1 text-[10px] font-semibold uppercase text-danger">
                        {card.sla_bucket && card.sla_bucket !== "none" ? `${card.sla_bucket}+` : "Responder"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="glass-panel rounded-2xl border border-border/60 p-4 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="label-overline">Agenda de hoje</p>
                <p className="mt-1 text-sm font-semibold text-foreground">Mensagens programadas</p>
              </div>
              <span className="rounded-lg border border-border/60 bg-surface/60 px-2.5 py-1 text-xs text-secondary">
                {scheduledToday.length}
              </span>
            </div>
            <div className="mt-3 space-y-2">
              {scheduledToday.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/60 px-3 py-5 text-center text-sm text-secondary">
                  Nenhuma mensagem programada para hoje.
                </p>
              ) : (
                scheduledToday.slice(0, 6).map((message) => (
                  <div key={message.id} className="rounded-xl border border-border/60 bg-card px-3 py-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="line-clamp-2 text-sm text-foreground">{message.content}</p>
                      <span className="shrink-0 text-xs font-semibold text-secondary">
                        {new Date(message.scheduled_for).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
