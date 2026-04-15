import { z } from "zod";

export const createMessageTemplateSchema = z.object({
  title: z.string().trim().min(2).max(80),
  content: z.string().trim().min(1).max(5000)
});

export const updateMessageTemplateSchema = createMessageTemplateSchema.partial().extend({
  is_active: z.boolean().optional()
});
