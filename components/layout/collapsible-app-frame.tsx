"use client";

import type { ReactNode } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CollapsibleAppFrame({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <main className="min-h-screen p-3 md:p-4">
      <div
        className={cn(
          "grid min-h-[calc(100vh-2rem)] grid-cols-1 gap-3 transition-all duration-200 xl:grid-cols-[minmax(0,1fr)]",
          sidebarOpen && "xl:grid-cols-[240px_minmax(0,1fr)]"
        )}
      >
        {sidebarOpen ? (
          <div className="min-h-0">
            <Sidebar />
          </div>
        ) : null}

        <div className="min-w-0">
          <div className="mb-2 flex justify-start">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => setSidebarOpen((current) => !current)}
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
              {sidebarOpen ? "Recolher menu" : "Expandir menu"}
            </Button>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
