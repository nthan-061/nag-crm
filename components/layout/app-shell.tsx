import { CrmBoard } from "@/components/crm-board";
import { Sidebar } from "@/components/layout/sidebar";
import type { DashboardData } from "@/lib/types/database";

export function AppShell({ initialData }: { initialData: DashboardData }) {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        <CrmBoard initialColumns={initialData.columns} initialCards={initialData.cards} />
      </div>
    </main>
  );
}
