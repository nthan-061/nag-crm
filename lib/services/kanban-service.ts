import { listCards, updateCardPosition } from "@/lib/repositories/cards-repository";
import { moveCardSchema } from "@/lib/validations/cards";

export async function getKanbanCards() {
  return listCards();
}

export async function moveKanbanCard(payload: unknown) {
  const parsed = moveCardSchema.parse(payload);
  return updateCardPosition(parsed);
}
