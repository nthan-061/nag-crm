import { ConversationsWorkspace } from "@/components/chat/conversations-workspace";
import { CollapsibleAppFrame } from "@/components/layout/collapsible-app-frame";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const data = await getDashboardData();

  return (
    <CollapsibleAppFrame>
      <ConversationsWorkspace initialCards={data.cards} />
    </CollapsibleAppFrame>
  );
}
