import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen p-4 md:p-5">
      <div className="grid min-h-[calc(100vh-2.5rem)] grid-cols-1 gap-4 xl:grid-cols-[256px_minmax(0,1fr)]">
        <Sidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}
