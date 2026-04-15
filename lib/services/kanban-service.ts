import { listCards, updateCardPosition } from "@/lib/repositories/cards-repository";
import { recordCrmEvent } from "@/lib/repositories/events-repository";
import { moveCardSchema } from "@/lib/validations/cards";

export async function getKanbanCards() {
  return listCards();
}

export async function moveKanbanCard(payload: unknown) {
  const parsed = moveCardSchema.parse(payload);
  const updatedCard = await updateCardPosition(parsed);

  await recordCrmEvent({
    eventType: "card.moved",
    source: "kanban",
    payload: {
      cardId: parsed.cardId,
      fromColumnId: parsed.fromColumnId,
      toColumnId: parsed.toColumnId
    }
  });

  return updatedCard;
}
