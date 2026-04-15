import { z } from "zod";
import type { MessageMediaType } from "@/lib/types/database";

export const sendMessageSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().min(1).max(5000)
});

export const allowedMessageMediaMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/ogg",
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/webm",
  "video/mp4",
  "video/quicktime",
  "video/3gpp",
  "video/webm",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/zip",
  "text/plain",
  "application/octet-stream"
] as const;

export const sendMediaFieldsSchema = z.object({
  leadId: z.string().uuid(),
  caption: z.string().max(5000).optional().default("")
});

export const messageMediaTypeLabels: Record<Exclude<MessageMediaType, "text" | "sticker" | "contact" | "location" | "unknown">, string> = {
  image: "Imagem",
  audio: "Audio",
  video: "Video",
  document: "Documento"
};
