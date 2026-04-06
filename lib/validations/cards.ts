import { z } from "zod";

export const moveCardSchema = z.object({
  cardId: z.string().uuid(),
  fromColumnId: z.string().uuid().nullable().optional(),
  toColumnId: z.string().uuid()
});
