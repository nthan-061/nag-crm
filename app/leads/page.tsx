import { AppFrame } from "@/components/layout/app-frame";
import { LeadsTable } from "@/components/leads/leads-table";
import { listLeads } from "@/lib/repositories/leads-repository";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await listLeads();

  return (
    <AppFrame>
      <LeadsTable initialLeads={leads} />
    </AppFrame>
  );
}
