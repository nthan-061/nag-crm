import { AppShell } from "@/components/layout/app-shell";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const data = await getDashboardData();
  return <AppShell initialData={data} />;
}
