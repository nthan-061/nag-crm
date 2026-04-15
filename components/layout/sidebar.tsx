"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, KanbanSquare, ListTodo, MessageCircleMore, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  { label: "Pipeline", icon: KanbanSquare, href: "/pipeline" },
  { label: "Conversas", icon: MessageCircleMore, href: "/conversations" },
  { label: "Atividades", icon: ListTodo, href: "/activities" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Configuracoes", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-surface flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 shadow-premium">

      {/* ── Brand header ──────────────────────────── */}
      <div className="border-b border-border/50 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-accent/15 bg-accent-muted/70 shadow-inner-highlight">
            <Image
              src="/logo-blue.png"
              alt="Nathan Alves Group"
              width={24}
              height={24}
              className="opacity-90 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-[13px] font-bold tracking-tight text-foreground leading-none">
              NAG CRM
            </h1>
            <p className="mt-1 text-[9px] font-semibold uppercase leading-none tracking-[0.18em] text-secondary/60">
              Nathan Alves Group
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav className="flex-1 space-y-0.5 px-2.5 py-3">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "relative flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-150",
                isActive
                  ? "bg-accent/10 text-foreground"
                  : "text-secondary hover:bg-accent/[0.06] hover:text-foreground/80"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-r-full bg-accent" />
              )}
              <Icon
                className={cn(
                  "h-3.5 w-3.5 flex-shrink-0 transition-colors",
                  isActive ? "text-accent" : "text-secondary"
                )}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Status footer ─────────────────────────── */}
      <div className="px-2.5 pb-3">
        <div className="flex items-center gap-2.5 rounded-xl border border-success/20 bg-success/[0.07] px-3 py-2.5">
          <div className="flex-shrink-0 h-2 w-2 rounded-full bg-success live-dot" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold leading-none text-foreground">WhatsApp ativo</p>
            <p className="mt-1 truncate text-[10px] leading-none text-secondary/70">
              Capturando leads em tempo real
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
