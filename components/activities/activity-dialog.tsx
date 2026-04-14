"use client";

import { X } from "lucide-react";
import { ActivityForm, type ActivityFormValues } from "@/components/activities/activity-form";
import type { ActivityLead, ActivityWithLead } from "@/lib/types/database";

export function ActivityDialog({
  open,
  activity,
  leads,
  saving,
  onClose,
  onSubmit
}: {
  open: boolean;
  activity: ActivityWithLead | null;
  leads: ActivityLead[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (values: ActivityFormValues) => Promise<void>;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-border/60 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border/45 px-5 py-4">
          <div>
            <p className="label-overline">Atividades</p>
            <h2 className="mt-1 text-lg font-bold text-foreground">
              {activity ? "Editar atividade" : "Nova atividade"}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition hover:bg-accent/[0.06] hover:text-foreground"
            onClick={onClose}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-5">
          <ActivityForm activity={activity} leads={leads} saving={saving} onCancel={onClose} onSubmit={onSubmit} />
        </div>
      </div>
    </div>
  );
}
