"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { REALTIME_CHANNEL } from "@/lib/constants";
import { LEAD_DELETED_EVENT, LEAD_DELETED_STORAGE_KEY } from "@/lib/lead-events";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import type { DashboardData } from "@/lib/types/database";

export function DashboardLive({ initialData }: { initialData: DashboardData }) {
  const [data, setData] = useState(initialData);
  const latestRefreshId = useRef(0);

  async function refreshDashboard() {
    const refreshId = ++latestRefreshId.current;

    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as { data?: DashboardData };
      if (refreshId !== latestRefreshId.current || !payload.data) {
        return;
      }

      setData(payload.data);
    } catch {
      // Preserve the current dashboard if the background refresh fails.
    }
  }

  useEffect(() => {
    void refreshDashboard();
  }, []);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`${REALTIME_CHANNEL}-dashboard`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void refreshDashboard())
      .on("postgres_changes", { event: "*", schema: "public", table: "cards" }, () => void refreshDashboard())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshDashboard();
    }, 60000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleStorage(event: StorageEvent) {
      if (event.key !== LEAD_DELETED_STORAGE_KEY || !event.newValue) return;
      void refreshDashboard();
    }

    function handleLeadDeleted() {
      void refreshDashboard();
    }

    window.addEventListener("storage", handleStorage);
    window.addEventListener(LEAD_DELETED_EVENT, handleLeadDeleted);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(LEAD_DELETED_EVENT, handleLeadDeleted);
    };
  }, []);

  return <DashboardOverview data={data} />;
}
