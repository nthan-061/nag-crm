"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Invisible client component that invalidates the Next.js 14 router cache
 * on mount. This forces the dashboard page to re-fetch server data every
 * time the user navigates to it, keeping it in sync with /leads and /pipeline.
 *
 * Background: force-dynamic prevents server-side caching, but Next.js 14
 * still holds a client-side router cache (30s TTL) for dynamically rendered
 * pages. Without this component, navigating to /dashboard via the sidebar
 * within 30s serves the cached rendered HTML instead of fresh data.
 */
export function DashboardRefresher() {
  const router = useRouter();

  useEffect(() => {
    router.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
