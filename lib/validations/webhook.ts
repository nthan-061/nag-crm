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

const dataObjectSchema = z.object({
  messages: z.array(messageDataSchema).optional(),
  key: messageKeySchema.optional(),
  message: z.record(z.unknown()).optional(),
  pushName: z.string().optional(),
  messageTimestamp: z.union([z.string(), z.number()]).optional(),
});

// Evolution API envia data como objeto OU como array dependendo do tipo de evento
const dataSchema = z.union([dataObjectSchema, z.array(messageDataSchema)]);

export const webhookMessageSchema = z.object({
  event: z.string().optional(),
  data: dataSchema.optional(),
  key: messageKeySchema.optional(),
  message: z.record(z.unknown()).optional(),
  pushName: z.string().optional(),
  messageTimestamp: z.union([z.string(), z.number()]).optional(),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

export type WebhookMessage = z.infer<typeof webhookMessageSchema>;
