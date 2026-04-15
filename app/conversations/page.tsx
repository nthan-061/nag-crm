import { ConversationsWorkspace } from "@/components/chat/conversations-workspace";
import { CollapsibleAppFrame } from "@/components/layout/collapsible-app-frame";
import { listConversations } from "@/lib/repositories/cards-repository";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  const conversations = await listConversations();

  return (
    <CollapsibleAppFrame>
      <ConversationsWorkspace initialCards={conversations} />
    </CollapsibleAppFrame>
  );
}
