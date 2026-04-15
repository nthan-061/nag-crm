import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SummaryCard({
  label,
  value,
  helper,
  icon,
  accent = false,
}: {
  label: string;
  value: string;
  helper: string;
  icon?: ReactNode;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "glass-panel relative overflow-hidden rounded-2xl border border-border/60 p-5 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/25 hover:shadow-premium",
        accent && "border-accent/30"
      )}
    >
      {/* Subtle top highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <p className="label-overline">{label}</p>
        {icon && (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {icon}
          </div>
        )}
      </div>

      <p className="mt-4 text-4xl font-bold tabular-nums tracking-tight text-foreground leading-none transition-colors duration-200">
        {value}
      </p>
      <p className="mt-2.5 text-xs text-secondary/70 leading-relaxed">{helper}</p>
    </div>
  );
}
