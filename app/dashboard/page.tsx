import { DashboardOverview } from "@/components/dashboard/dashboard-overview";
import { DashboardRefresher } from "@/components/dashboard/dashboard-refresher";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <>
      {/* Invalidates the Next.js 14 client router cache on every navigation */}
      <DashboardRefresher />
      <DashboardOverview data={data} />
    </>
  );
}
