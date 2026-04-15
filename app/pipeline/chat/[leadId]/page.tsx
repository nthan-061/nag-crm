import { LeadChatScreen } from "@/components/chat/lead-chat-screen";
import { AppFrame } from "@/components/layout/app-frame";
import { listConversations } from "@/lib/repositories/cards-repository";

export const dynamic = "force-dynamic";

export default async function PipelineChatPage({
  params
}: {
  params: { leadId: string };
}) {
  const conversations = await listConversations();
  const selectedCard = conversations.find((card) => card.lead_id === params.leadId) ?? null;

  return (
    <AppFrame>
      <div className="h-[calc(100vh-1.5rem)] md:h-[calc(100vh-2rem)]">
        <LeadChatScreen selectedCard={selectedCard} />
      </div>
    </AppFrame>
  );
}
