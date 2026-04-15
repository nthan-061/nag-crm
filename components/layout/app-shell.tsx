import { CrmBoard } from "@/components/crm-board";
import { AppFrame } from "@/components/layout/app-frame";
import type { DashboardData } from "@/lib/types/database";

export function AppShell({ initialData }: { initialData: DashboardData }) {
  return (
    <AppFrame>
      {/* Keep the board height tied to the compact AppFrame padding. */}
      <div className="h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2rem)]">
        <CrmBoard initialColumns={initialData.columns} initialCards={initialData.cards} />
      </div>
    </AppFrame>
  );
}
