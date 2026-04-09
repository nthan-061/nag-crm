"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, KanbanSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { label: "Dashboard", icon: BarChart3, href: "/dashboard" },
  { label: "Pipeline", icon: KanbanSquare, href: "/pipeline" },
  { label: "Leads", icon: Users, href: "/leads" },
  { label: "Configuracoes", icon: Settings, href: "/settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar-surface flex h-full flex-col rounded-2xl border border-border/60 overflow-hidden shadow-premium">

      {/* ── Brand header ──────────────────────────── */}
      <div className="px-5 pt-6 pb-5 border-b border-border/50">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-accent/25 bg-accent-muted/60">
            <Image
              src="/logo-white.png"
              alt="Nathan Alves Group"
              width={26}
              height={26}
              className="opacity-85 object-contain"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold tracking-tight text-foreground leading-none">
              NAG CRM
            </h1>
            <p className="mt-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-secondary/60 leading-none">
              Nathan Alves Group
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ────────────────────────────── */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
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
                "relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-accent/12 text-foreground"
                  : "text-secondary hover:bg-white/[0.04] hover:text-foreground/80"
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent" />
              )}
              <Icon
                className={cn(
                  "h-4 w-4 flex-shrink-0 transition-colors",
                  isActive ? "text-accent" : "text-secondary"
                )}
              />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Status footer ─────────────────────────── */}
      <div className="px-3 pb-4">
        <div className="flex items-center gap-3 rounded-xl border border-success/20 bg-success/[0.07] px-3.5 py-3">
          <div className="flex-shrink-0 h-2 w-2 rounded-full bg-success live-dot" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground leading-none">WhatsApp ativo</p>
            <p className="mt-1 text-[11px] text-secondary/70 leading-none truncate">
              Capturando leads em tempo real
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
