import { z } from "zod";

export const webhookMessageSchema = z.object({
  data: z.object({
    key: z.object({ remoteJid: z.string().optional() }).optional(),
    message: z.record(z.any()).optional(),
    messageType: z.string().optional(),
    pushName: z.string().optional(),
    messageTimestamp: z.union([z.string(), z.number()]).optional()
  })
});
