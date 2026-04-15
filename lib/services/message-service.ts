import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { touchCard } from "@/lib/repositories/cards-repository";
import { createMessage, listMessagesByLead, updateMessageMedia } from "@/lib/repositories/messages-repository";
import { resolveInstanceName, sendEvolutionMediaMessage } from "@/lib/services/evolution-client";
import {
  allowedMessageMediaMimeTypes,
  messageMediaTypeLabels,
  sendMediaFieldsSchema,
  sendMessageSchema
} from "@/lib/validations/messages";
import {
  cleanMimeType,
  getMediaTypeFromMime,
  MEDIA_SIZE_LIMITS,
  sanitizeFileName,
  uploadMessageMediaFromBuffer
} from "@/lib/services/media-storage-service";
import type { MessageMediaType } from "@/lib/types/database";

export async function getMessages(leadId: string) {
  return listMessagesByLead(leadId);
}

async function getLeadMessagingContext(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: card } = await supabase.from("cards").select("id").eq("lead_id", leadId).maybeSingle();
  const { data: lead } = await supabase.from("leads").select("telefone").eq("id", leadId).maybeSingle();

  if (!lead?.telefone) {
    throw new Error("Lead sem telefone para envio");
  }

  return { cardId: card?.id ?? null, phone: lead.telefone };
}

function assertAllowedMediaFile(file: File) {
  const mimeType = cleanMimeType(file.type);
  if (!allowedMessageMediaMimeTypes.includes(mimeType as (typeof allowedMessageMediaMimeTypes)[number])) {
    throw new Error(`Tipo de arquivo nao permitido: ${mimeType}`);
  }

  const mediaType = getMediaTypeFromMime(mimeType);
  const limit = MEDIA_SIZE_LIMITS[mediaType] ?? MEDIA_SIZE_LIMITS.unknown;
  if (file.size <= 0) throw new Error("Arquivo vazio");
  if (file.size > limit) {
    throw new Error(`${messageMediaTypeLabels[mediaType]} excede o limite de ${Math.round(limit / 1024 / 1024)}MB`);
  }

  return { mimeType, mediaType };
}

function mediaPlaceholder(mediaType: Exclude<MessageMediaType, "text" | "sticker" | "contact" | "location" | "unknown">) {
  return {
    image: "[Imagem enviada]",
    audio: "[Audio enviado]",
    video: "[Video enviado]",
    document: "[Documento enviado]"
  }[mediaType];
}

export async function sendMessage(payload: unknown) {
  const parsed = sendMessageSchema.parse(payload);
  const timestamp = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { data: card } = await supabase.from("cards").select("id").eq("lead_id", parsed.leadId).maybeSingle();
  const env = getEnv();
  const { data: lead } = await supabase.from("leads").select("telefone").eq("id", parsed.leadId).maybeSingle();

  if (lead?.telefone && env.evolutionApiUrl && env.evolutionApiKey && env.evolutionInstance) {
    const instanceName = await resolveInstanceName();
    const response = await fetch(
      `${env.evolutionApiUrl}/message/sendText/${encodeURIComponent(instanceName ?? env.evolutionInstance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.evolutionApiKey
        },
        body: JSON.stringify({
          number: lead.telefone,
          text: parsed.content
        })
      }
    );

    if (!response.ok) {
      throw new Error("Falha ao enviar mensagem pela Evolution");
    }

    const evolutionResponse = (await response.json().catch(() => null)) as {
      key?: { id?: string };
    } | null;
    const externalId = evolutionResponse?.key?.id ?? undefined;

    const message = await createMessage({
      lead_id: parsed.leadId,
      conteudo: parsed.content,
      tipo: "saida",
      timestamp,
      external_id: externalId
    });

    if (card?.id) {
      await touchCard(card.id, timestamp);
    }

    return message;
  }

  const message = await createMessage({
    lead_id: parsed.leadId,
    conteudo: parsed.content,
    tipo: "saida",
    timestamp
  });

  if (card?.id) {
    await touchCard(card.id, timestamp);
  }

  return message;
}

export async function sendMediaMessage(formData: FormData) {
  const parsed = sendMediaFieldsSchema.parse({
    leadId: formData.get("leadId"),
    caption: formData.get("caption") ?? ""
  });
  const file = formData.get("file");

  if (!(file instanceof File)) {
    throw new Error("Arquivo de midia obrigatorio");
  }

  const { mimeType, mediaType } = assertAllowedMediaFile(file);
  const timestamp = new Date().toISOString();
  const { cardId, phone } = await getLeadMessagingContext(parsed.leadId);
  const fileName = sanitizeFileName(file.name);
  const caption = parsed.caption.trim();
  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString("base64");

  const sent = await sendEvolutionMediaMessage({
    number: phone,
    mediaType,
    base64,
    mimeType,
    fileName,
    caption
  });

  const createdMessage = await createMessage({
    lead_id: parsed.leadId,
    conteudo: caption || fileName || mediaPlaceholder(mediaType),
    tipo: "saida",
    timestamp,
    external_id: sent.externalId,
    media_type: mediaType,
    media_mime_type: mimeType,
    media_file_name: fileName,
    media_size: buffer.byteLength,
    media_metadata: {
      sentFromCrm: true,
      caption: caption || null,
      evolutionResponse: sent.externalId ? { externalId: sent.externalId } : null
    }
  });

  if (!createdMessage) {
    throw new Error("Mensagem enviada, mas ja existia no CRM");
  }

  try {
    const uploaded = await uploadMessageMediaFromBuffer({
      buffer,
      leadId: parsed.leadId,
      messageId: createdMessage.id,
      mimeType,
      fileName
    });

    const updated = await updateMessageMedia(createdMessage.id, {
      media_mime_type: uploaded.mimeType,
      media_storage_path: uploaded.storagePath,
      media_url: `/api/messages/media/${createdMessage.id}`,
      media_size: uploaded.size,
      media_metadata: {
        ...(createdMessage.media_metadata ?? {}),
        storageUploadedAt: new Date().toISOString()
      }
    });

    if (cardId) await touchCard(cardId, timestamp);
    return updated;
  } catch (error) {
    console.warn("[message-send-media] sent to Evolution but failed to store media", {
      messageId: createdMessage.id,
      error: error instanceof Error ? error.message : String(error)
    });

    if (cardId) await touchCard(cardId, timestamp);
    return createdMessage;
  }
}
