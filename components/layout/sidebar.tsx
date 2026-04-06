import { BarChart3, KanbanSquare, MessageSquareText, Settings } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: BarChart3, active: true },
  { label: "Pipeline", icon: KanbanSquare },
  { label: "Leads", icon: MessageSquareText },
  { label: "Configurações", icon: Settings }
];

export function Sidebar() {
  return (
    <Card className="flex h-full flex-col gap-6 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.32em] text-accent">Nathan Alves Group</p>
        <h1 className="mt-3 text-2xl font-semibold text-foreground">NAG CRM</h1>
        <p className="mt-2 text-sm text-secondary">Operação comercial com WhatsApp em tempo real.</p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition",
                item.active
                  ? "border-accent/30 bg-accent/10 text-foreground"
                  : "border-transparent bg-transparent text-secondary hover:border-border hover:bg-white/5 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl border border-accent/20 bg-accent/10 p-4">
        <p className="text-sm font-medium text-foreground">Webhook pronto para captar leads</p>
        <p className="mt-1 text-xs text-secondary">Novas conversas entram direto em Entrada de Lead.</p>
      </div>
    </Card>
  );
}
