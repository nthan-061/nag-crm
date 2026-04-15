import { LeadChatScreen } from "@/components/chat/lead-chat-screen";
import { AppFrame } from "@/components/layout/app-frame";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";

export default async function PipelineChatPage({
  params
}: {
  params: { leadId: string };
}) {
  const data = await getDashboardData();
  const selectedCard = data.cards.find((card) => card.lead_id === params.leadId) ?? null;

  return (
    <AppFrame>
      <div className="h-[calc(100vh-2rem)] md:h-[calc(100vh-2.5rem)]">
        <LeadChatScreen selectedCard={selectedCard} />
      </div>
    </AppFrame>
  );
}
