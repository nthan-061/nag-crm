import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
        <Sidebar />
        {children}
      </div>
    </main>
  );
}
