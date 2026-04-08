import { z } from "zod";

export const createNoteSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1).max(5000)
});

export const noteContentSchema = z.object({
  content: z.string().min(1).max(5000)
});
