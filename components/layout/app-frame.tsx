import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

/**
 * contained=true  → viewport-locked layout (no page scroll).
 *   Used by the pipeline page where the chat panel must be fully visible
 *   within the viewport without any outer scrolling.
 *
 * contained=false (default) → standard scrollable layout.
 *   Used by leads, settings, and other pages that can grow beyond the fold.
 */
export function AppFrame({
  children,
  contained = false,
}: {
  children: ReactNode;
  contained?: boolean;
}) {
  return (
    <main
      className={
        contained
          ? "h-screen overflow-hidden p-4 md:p-5"
          : "min-h-screen p-4 md:p-5"
      }
    >
      <div
        className={
          contained
            ? "grid h-full grid-cols-1 gap-4 xl:grid-cols-[256px_minmax(0,1fr)]"
            : "grid min-h-[calc(100vh-2.5rem)] grid-cols-1 gap-4 xl:grid-cols-[256px_minmax(0,1fr)]"
        }
      >
        <Sidebar />
        <div className={contained ? "min-w-0 h-full overflow-hidden" : "min-w-0"}>
          {children}
        </div>
      </div>
    </main>
  );
}
