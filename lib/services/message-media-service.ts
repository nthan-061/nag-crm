import {
  findMessageByExternalId,
  listPendingMediaMessages,
  updateMessageMedia
} from "@/lib/repositories/messages-repository";
import { getBase64FromMediaMessage, type EvolutionMessage } from "@/lib/services/evolution-client";
import { uploadMessageMedia } from "@/lib/services/media-storage-service";
import type { Message } from "@/lib/types/database";
import type { NormalizedMessageContent } from "@/lib/services/whatsapp-message-normalizer";

function getHydrationAttempts(message: Message) {
  const attempts = message.media_metadata?.hydrationAttempts;
  return typeof attempts === "number" && Number.isFinite(attempts) ? attempts : 0;
}

async function markMediaHydrationFailure(message: Message, error: string) {
  await updateMessageMedia(message.id, {
    media_metadata: {
      ...(message.media_metadata ?? {}),
      hydrationAttempts: getHydrationAttempts(message) + 1,
      hydrationFailedAt: new Date().toISOString(),
      hydrationError: error.slice(0, 240)
    }
  }).catch((updateError) => {
    console.warn("[message-media] failed to record hydration failure", {
      messageId: message.id,
      error: updateError instanceof Error ? updateError.message : String(updateError)
    });
  });
}

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
      await markMediaHydrationFailure(input.message, "Evolution did not return media base64");
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
    const message = error instanceof Error ? error.message : String(error);
    console.warn("[message-media] failed to hydrate media", {
      messageId: input.message.id,
      externalId: input.message.external_id,
      mediaType: input.normalized.mediaType,
      error: message
    });
    await markMediaHydrationFailure(input.message, message);
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

function getRawEvolutionMessage(message: Message): Record<string, unknown> | null {
  const raw = message.media_metadata?.raw;
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return {
      key: {
        id: message.external_id ?? undefined,
        fromMe: message.tipo === "saida"
      },
      message: {
        [`${message.media_type}Message`]: raw
      }
    };
  }

  return null;
}

export async function processPendingMessageMedia(limit = 5) {
  const pending = await listPendingMediaMessages(Math.max(limit * 5, limit));
  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const message of pending) {
    if (processed + failed >= limit) break;

    if (getHydrationAttempts(message) >= 3) {
      skipped++;
      continue;
    }

    const rawEvolutionMessage = getRawEvolutionMessage(message);
    if (!rawEvolutionMessage) {
      failed++;
      console.warn("[message-media] pending media missing raw metadata", {
        messageId: message.id,
        externalId: message.external_id,
        mediaType: message.media_type
      });
      continue;
    }

    const hydrated = await hydrateMessageMedia({
      message,
      leadId: message.lead_id,
      rawEvolutionMessage,
      normalized: {
        content: message.conteudo,
        mediaType: message.media_type,
        media: {
          mimetype: message.media_mime_type,
          fileName: message.media_file_name,
          fileLength: message.media_size,
          seconds: message.media_duration_seconds,
          caption: typeof message.media_metadata?.caption === "string" ? message.media_metadata.caption : null,
          thumbnail: message.media_thumbnail,
          raw: (message.media_metadata?.raw as Record<string, unknown> | undefined) ?? undefined
        }
      }
    });

    if (hydrated.media_storage_path) {
      processed++;
    } else {
      failed++;
    }
  }

  return {
    ok: true,
    checked: pending.length,
    processed,
    failed,
    skipped
  };
}
