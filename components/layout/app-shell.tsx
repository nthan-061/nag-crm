import { CrmBoard } from "@/components/crm-board";
import { AppFrame } from "@/components/layout/app-frame";
import type { DashboardData } from "@/lib/types/database";

export function AppShell({ initialData }: { initialData: DashboardData }) {
  return (
    <AppFrame>
      {/*
       * Explicit viewport-minus-padding height so CrmBoard and the chat
       * panel inside it can use h-full reliably without a fragile cascade.
       *
       * AppFrame.main has p-4 on mobile (2×16px = 32px) and md:p-5 on
       * medium+ screens (2×20px = 40px). Subtract those from 100vh so the
       * pipeline board fills the viewport exactly without overflowing.
       */}
      <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-2.5rem)]">
        <CrmBoard initialColumns={initialData.columns} initialCards={initialData.cards} />
      </div>
    </AppFrame>
  );
}
