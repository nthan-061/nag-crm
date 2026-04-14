import type { MessageMediaType } from "@/lib/types/database";

export type NormalizedMessageContent = {
  content: string;
  mediaType: MessageMediaType;
  media?: {
    mimetype?: string | null;
    fileName?: string | null;
    fileLength?: number | null;
    seconds?: number | null;
    caption?: string | null;
    thumbnail?: string | null;
    raw?: Record<string, unknown>;
  };
};

function unwrapMessage(message: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!message) return undefined;
  const ephemeral = message.ephemeralMessage as { message?: Record<string, unknown> } | undefined;
  if (ephemeral?.message) return unwrapMessage(ephemeral.message);
  const viewOnce = message.viewOnceMessage as { message?: Record<string, unknown> } | undefined;
  if (viewOnce?.message) return unwrapMessage(viewOnce.message);
  const viewOnceV2 = message.viewOnceMessageV2 as { message?: Record<string, unknown> } | undefined;
  if (viewOnceV2?.message) return unwrapMessage(viewOnceV2.message);
  return message;
}

function pickString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function pickNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeMediaMessage(input: {
  raw: Record<string, unknown>;
  mediaType: MessageMediaType;
  placeholder: string;
  caption?: string | null;
}): NormalizedMessageContent {
  const caption = input.caption?.trim() || null;
  const seconds = pickNumber(input.raw.seconds) ?? pickNumber(input.raw.duration);
  const fileLength = pickNumber(input.raw.fileLength) ?? pickNumber(input.raw.fileSize);

  return {
    content: caption ?? input.placeholder,
    mediaType: input.mediaType,
    media: {
      mimetype: pickString(input.raw.mimetype) ?? pickString(input.raw.mimeType),
      fileName: pickString(input.raw.fileName) ?? pickString(input.raw.fileName),
      fileLength,
      seconds,
      caption,
      thumbnail:
        pickString(input.raw.jpegThumbnail) ??
        pickString(input.raw.thumbnail) ??
        pickString(input.raw.thumbnailDirectPath),
      raw: input.raw
    }
  };
}

export function normalizeWhatsAppMessageContent(
  message: Record<string, unknown> | undefined
): NormalizedMessageContent | null {
  const payload = unwrapMessage(message);
  if (!payload) return null;

  const conversation = payload.conversation;
  if (typeof conversation === "string" && conversation.trim()) {
    return { content: conversation.trim(), mediaType: "text" };
  }

  const extendedText = (payload.extendedTextMessage as { text?: string } | undefined)?.text;
  if (typeof extendedText === "string" && extendedText.trim()) {
    return { content: extendedText.trim(), mediaType: "text" };
  }

  const imageMessage = payload.imageMessage as Record<string, unknown> | undefined;
  if (imageMessage) {
    return normalizeMediaMessage({
      raw: imageMessage,
      mediaType: "image",
      placeholder: "[Imagem recebida]",
      caption: pickString(imageMessage.caption)
    });
  }

  const audioMessage = (payload.audioMessage ?? payload.pttMessage) as Record<string, unknown> | undefined;
  if (audioMessage) {
    return normalizeMediaMessage({
      raw: audioMessage,
      mediaType: "audio",
      placeholder: "[Audio recebido]"
    });
  }

  const videoMessage = payload.videoMessage as Record<string, unknown> | undefined;
  if (videoMessage) {
    return normalizeMediaMessage({
      raw: videoMessage,
      mediaType: "video",
      placeholder: "[Video recebido]",
      caption: pickString(videoMessage.caption)
    });
  }

  const documentMessage = payload.documentMessage as Record<string, unknown> | undefined;
  if (documentMessage) {
    return normalizeMediaMessage({
      raw: documentMessage,
      mediaType: "document",
      placeholder: "[Documento recebido]",
      caption: pickString(documentMessage.caption)
    });
  }

  const stickerMessage = payload.stickerMessage as Record<string, unknown> | undefined;
  if (stickerMessage) {
    return normalizeMediaMessage({
      raw: stickerMessage,
      mediaType: "sticker",
      placeholder: "[Sticker recebido]"
    });
  }

  if (payload.contactMessage) return { content: "[Contato recebido]", mediaType: "contact" };
  if (payload.locationMessage) return { content: "[Localizacao recebida]", mediaType: "location" };

  const reaction = payload.reactionMessage as { text?: string } | undefined;
  if (reaction?.text) return { content: `[Reagiu: ${reaction.text}]`, mediaType: "text" };
  if (payload.reactionMessage) return { content: "[Reacao recebida]", mediaType: "text" };

  const buttonResponse = payload.buttonsResponseMessage as { selectedDisplayText?: string } | undefined;
  if (buttonResponse?.selectedDisplayText) return { content: `[Respondeu: ${buttonResponse.selectedDisplayText}]`, mediaType: "text" };

  const listResponse = payload.listResponseMessage as { title?: string } | undefined;
  if (listResponse?.title) return { content: `[Selecionou: ${listResponse.title}]`, mediaType: "text" };

  const templateReply = payload.templateButtonReplyMessage as { selectedDisplayText?: string } | undefined;
  if (templateReply?.selectedDisplayText) return { content: `[Respondeu: ${templateReply.selectedDisplayText}]`, mediaType: "text" };

  const pollCreation = payload.pollCreationMessage as { name?: string } | undefined;
  if (pollCreation?.name) return { content: `[Enquete: ${pollCreation.name}]`, mediaType: "text" };
  if (payload.pollUpdateMessage) return { content: "[Votou em enquete]", mediaType: "text" };

  return null;
}

export function toMessageMediaInput(normalized: NormalizedMessageContent) {
  return {
    media_type: normalized.mediaType,
    media_mime_type: normalized.media?.mimetype ?? null,
    media_file_name: normalized.media?.fileName ?? null,
    media_size: normalized.media?.fileLength ?? null,
    media_duration_seconds: normalized.media?.seconds ?? null,
    media_thumbnail: normalized.media?.thumbnail ?? null,
    media_metadata: normalized.media
      ? {
          caption: normalized.media.caption ?? null,
          raw: normalized.media.raw ?? null
        }
      : {}
  };
}
