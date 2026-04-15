import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const MESSAGE_MEDIA_BUCKET = "message-media";

export const MEDIA_SIZE_LIMITS = {
  image: 10 * 1024 * 1024,
  audio: 16 * 1024 * 1024,
  video: 50 * 1024 * 1024,
  document: 32 * 1024 * 1024,
  unknown: 10 * 1024 * 1024
} as const;

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
  "video/quicktime": "mov",
  "video/3gpp": "3gp",
  "video/webm": "webm",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/zip": "zip",
  "text/plain": "txt",
  "application/octet-stream": "bin"
};

export function cleanMimeType(value: string | null | undefined) {
  return value?.split(";")[0]?.trim().toLowerCase() || "application/octet-stream";
}

export function getMediaExtension(mimeType: string, fileName?: string | null) {
  const clean = cleanMimeType(mimeType);
  if (MIME_EXTENSION[clean]) return MIME_EXTENSION[clean];
  if (clean.startsWith("video/")) return "mp4";
  const extension = fileName?.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (extension && extension.length <= 8) return extension;
  return "bin";
}

export function getMediaTypeFromMime(mimeType: string) {
  const clean = cleanMimeType(mimeType);
  if (clean.startsWith("image/")) return "image" as const;
  if (clean.startsWith("audio/")) return "audio" as const;
  if (clean.startsWith("video/")) return "video" as const;
  return "document" as const;
}

export function sanitizeFileName(value: string | null | undefined) {
  const clean = value?.replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, " ").trim();
  return clean || "arquivo";
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

export async function uploadMessageMediaFromBuffer(input: {
  buffer: Buffer;
  leadId: string;
  messageId: string;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  const mimeType = cleanMimeType(input.mimeType);
  const extension = getMediaExtension(mimeType, input.fileName);
  const mediaType = getMediaTypeFromMime(mimeType);
  const limit = MEDIA_SIZE_LIMITS[mediaType] ?? MEDIA_SIZE_LIMITS.unknown;

  if (!input.buffer.length) throw new Error("Midia vazia");
  if (input.buffer.byteLength > limit) throw new Error(`Midia excede o limite de ${Math.round(limit / 1024 / 1024)}MB`);

  const path = `messages/${safePathSegment(input.leadId)}/${safePathSegment(input.messageId)}.${extension}`;
  const supabase = createSupabaseAdminClient();

  const { error } = await supabase.storage.from(MESSAGE_MEDIA_BUCKET).upload(path, input.buffer, {
    contentType: mimeType,
    upsert: true
  });

  if (error) throw error;

  return {
    storagePath: path,
    mimeType,
    size: input.buffer.byteLength
  };
}

export async function uploadMessageMedia(input: {
  base64: string;
  leadId: string;
  messageId: string;
  mimeType?: string | null;
  fileName?: string | null;
}) {
  const base64 = stripBase64Prefix(input.base64).replace(/\s/g, "");
  return uploadMessageMediaFromBuffer({
    ...input,
    buffer: Buffer.from(base64, "base64")
  });
}

export async function createMessageMediaSignedUrl(storagePath: string, expiresIn = 60, downloadFileName?: string | null) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(MESSAGE_MEDIA_BUCKET)
    .createSignedUrl(storagePath, expiresIn, downloadFileName ? { download: downloadFileName } : undefined);

  if (error) throw error;
  return data.signedUrl;
}
