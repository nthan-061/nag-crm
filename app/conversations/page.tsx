import { ConversationsWorkspace } from "@/components/chat/conversations-workspace";
import { CollapsibleAppFrame } from "@/components/layout/collapsible-app-frame";
import { listCards } from "@/lib/repositories/cards-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ConversationsPage() {
  const conversations = await listCards();

  return (
    <CollapsibleAppFrame>
      <ConversationsWorkspace initialCards={conversations} />
    </CollapsibleAppFrame>
  );
}
