import { DashboardLive } from "@/components/dashboard/dashboard-live";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <DashboardLive initialData={data} />;
}
