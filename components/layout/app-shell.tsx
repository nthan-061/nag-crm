import { CrmBoard } from "@/components/crm-board";
import { AppFrame } from "@/components/layout/app-frame";
import type { DashboardData } from "@/lib/types/database";

export function AppShell({ initialData }: { initialData: DashboardData }) {
  return (
    <AppFrame>
      <div>
        <CrmBoard initialColumns={initialData.columns} initialCards={initialData.cards} />
      </div>
    </AppFrame>
  );
}
