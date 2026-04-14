import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MESSAGE_MEDIA_BUCKET = "message-media";

const MAX_MEDIA_BYTES = 50 * 1024 * 1024;

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/ogg": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "audio/webm": "webm",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
  "application/octet-stream": "bin"
};

function cleanMimeType(value: string | null | undefined) {
  return value?.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}

function extensionFromMimeType(mimeType: string) {
  return MIME_EXTENSION[cleanMimeType(mimeType)] ?? "bin";
}

function stripBase64Prefix(value: string) {
  const commaIndex = value.indexOf(",");
  if (value.startsWith("data:") && commaIndex >= 0) {
    return value.slice(commaIndex + 1);
  }
  return value;
}

function safePathSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export async function uploadMessageMedia(input: {
  base64: string;
  leadId: string;
  messageId: string;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  const mimeType = cleanMimeType(input.mimeType);
  const extension = extensionFromMimeType(mimeType);
  const base64 = stripBase64Prefix(input.base64).replace(/\s/g, "");
  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) throw new Error("Midia base64 vazia");
  if (buffer.byteLength > MAX_MEDIA_BYTES) throw new Error("Midia excede o limite de 50MB");

  const path = `messages/${safePathSegment(input.leadId)}/${safePathSegment(input.messageId)}.${extension}`;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).upload(path, buffer, {
    contentType: mimeType,
    upsert: true
  });

  if (error) throw error;

  return {
    storagePath: path,
    mimeType,
    size: buffer.byteLength
  };
}

export async function createMessageMediaSignedUrl(storagePath: string, expiresIn = 60) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
