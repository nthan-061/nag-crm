import { z } from "zod";

const messageKeySchema = z.object({
  remoteJid: z.string().optional(),
  fromMe: z.boolean().optional(),
  id: z.string().optional(),
  participant: z.string().optional(),
  senderPn: z.string().optional(),
});

const messageDataSchema = z.object({
  key: messageKeySchema.optional(),
  pushName: z.string().optional(),
  message: z.record(z.unknown()).optional(),
  messageType: z.string().optional(),
  messageTimestamp: z.union([z.string(), z.number()]).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
  remoteJid: z.string().optional(),
  senderPn: z.string().optional(),
  cleanedSenderPn: z.string().optional(),
});

export const webhookMessageSchema = z.object({
  event: z.string(),
  data: z
    .object({
      messages: z.array(messageDataSchema).optional(),
      key: messageKeySchema.optional(),
      message: z.record(z.unknown()).optional(),
      pushName: z.string().optional(),
      messageTimestamp: z.union([z.string(), z.number()]).optional(),
    })
    .optional(),
  key: messageKeySchema.optional(),
  message: z.record(z.unknown()).optional(),
  pushName: z.string().optional(),
  messageTimestamp: z.union([z.string(), z.number()]).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

export type WebhookMessage = z.infer<typeof webhookMessageSchema>;
