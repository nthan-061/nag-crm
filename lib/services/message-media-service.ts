import { findMessageByExternalId, updateMessageMedia } from "@/lib/repositories/messages-repository";
import { getBase64FromMediaMessage, type EvolutionMessage } from "@/lib/services/evolution-client";
import { uploadMessageMedia } from "@/lib/services/media-storage-service";
import type { Message } from "@/lib/types/database";
import type { NormalizedMessageContent } from "@/lib/services/whatsapp-message-normalizer";

export async function hydrateMessageMedia(input: {
  message: Message;
  leadId: string;
  rawEvolutionMessage: EvolutionMessage | Record<string, unknown>;
  normalized: NormalizedMessageContent;
}) {
  if (!["image", "audio", "video"].includes(input.normalized.mediaType)) return input.message;
  if (input.message.media_storage_path) return input.message;

  console.log("[message-media] media detected", {
    messageId: input.message.id,
    externalId: input.message.external_id,
    mediaType: input.normalized.mediaType,
    mimeType: input.normalized.media?.mimetype
  });

  try {
    const media = await getBase64FromMediaMessage({ message: input.rawEvolutionMessage });
    if (!media?.base64) {
      console.warn("[message-media] media base64 unavailable", {
        messageId: input.message.id,
        externalId: input.message.external_id,
        mediaType: input.normalized.mediaType
      });
      return input.message;
    }

    const uploaded = await uploadMessageMedia({
      base64: media.base64,
      leadId: input.leadId,
      messageId: input.message.id,
      mimeType: media.mimetype ?? input.normalized.media?.mimetype,
      fileName: media.fileName ?? input.normalized.media?.fileName
    });

    console.log("[message-media] upload completed", {
      messageId: input.message.id,
      externalId: input.message.external_id,
      storagePath: uploaded.storagePath,
      size: uploaded.size
    });

    return updateMessageMedia(input.message.id, {
      media_mime_type: uploaded.mimeType,
      media_file_name: media.fileName ?? input.normalized.media?.fileName ?? null,
      media_storage_path: uploaded.storagePath,
      media_url: `/api/messages/media/${input.message.id}`,
      media_size: media.size ?? uploaded.size,
      media_metadata: {
        ...(input.message.media_metadata ?? {}),
        caption: input.normalized.media?.caption ?? null,
        storageUploadedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.warn("[message-media] failed to hydrate media", {
      messageId: input.message.id,
      externalId: input.message.external_id,
      mediaType: input.normalized.mediaType,
      error: error instanceof Error ? error.message : String(error)
    });
    return input.message;
  }
}

export async function hydrateExistingMessageMedia(input: {
  externalId: string | undefined;
  leadId: string;
  rawEvolutionMessage: EvolutionMessage | Record<string, unknown>;
  normalized: NormalizedMessageContent;
}) {
  if (!input.externalId || !["image", "audio", "video"].includes(input.normalized.mediaType)) return null;

  const existing = await findMessageByExternalId(input.externalId);
  if (!existing || existing.media_storage_path) return existing;

  return hydrateMessageMedia({
    message: existing,
    leadId: input.leadId,
    rawEvolutionMessage: input.rawEvolutionMessage,
    normalized: input.normalized
  });
}
