import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen p-3 md:p-4">
      <div className="grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
