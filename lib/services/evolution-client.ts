import { getEnv } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvolutionChat = {
  id?: string;
  remoteJid?: string | null;
  name?: string;
  pushName?: string | null;
  profileName?: string | null;
  timestamp?: number;
  lastMessage?: {
    messageTimestamp?: number;
    message?: Record<string, unknown>;
  };
  unreadCount?: number;
};

export type EvolutionMessage = {
  key?: {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
  };
  message?: Record<string, unknown>;
  messageType?: string;
  messageTimestamp?: number;
  pushName?: string;
};

export type EvolutionMediaBase64 = {
  base64: string;
  mimetype?: string | null;
  fileName?: string | null;
  size?: number | null;
};

// ─── Instance resolution ──────────────────────────────────────────────────────

export async function resolveInstanceName(): Promise<string | null> {
  const env = getEnv();
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
    return null;
  }

  try {
    const response = await fetch(`${env.evolutionApiUrl}/instance/fetchInstances`, {
      headers: { apikey: env.evolutionApiKey },
      cache: "no-store",
    });

    if (!response.ok) return env.evolutionInstance;

    const instances = (await response.json()) as Array<{
      id?: string;
      name?: string;
      token?: string;
    }>;

    const normalized = env.evolutionInstance;
    const matched =
      instances.find((i) => i.name === normalized) ??
      instances.find((i) => i.token === normalized) ??
      instances.find((i) => i.id === normalized);

    return matched?.name ?? normalized;
  } catch {
    return env.evolutionInstance;
  }
}

// ─── Chat list ────────────────────────────────────────────────────────────────

export async function fetchInstanceChats(): Promise<EvolutionChat[]> {
  const env = getEnv();
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
    throw new Error("Evolution API nao configurada");
  }

  const instanceName = await resolveInstanceName();
  if (!instanceName) throw new Error("Instancia Evolution nao encontrada");

  const response = await fetch(
    `${env.evolutionApiUrl}/chat/findChats/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolutionApiKey,
      },
      body: JSON.stringify({}),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Evolution API retornou ${response.status} ao buscar chats`);
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as EvolutionChat[]) : [];
}

// ─── Message history ──────────────────────────────────────────────────────────

export async function fetchContactMessages(jid: string, limit = 50): Promise<EvolutionMessage[]> {
  const env = getEnv();
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
    throw new Error("Evolution API nao configurada");
  }

  const instanceName = await resolveInstanceName();
  if (!instanceName) throw new Error("Instancia Evolution nao encontrada");

  const response = await fetch(
    `${env.evolutionApiUrl}/chat/findMessages/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolutionApiKey,
      },
      body: JSON.stringify({ where: { key: { remoteJid: jid } }, limit }),
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(`Evolution API retornou ${response.status} ao buscar mensagens`);
  }

  const data = await response.json();
  const messages = Array.isArray(data)
    ? data
    : (
        (data as { messages?: EvolutionMessage[] | { records?: EvolutionMessage[] } })?.messages
      );

  if (Array.isArray(messages)) {
    return messages as EvolutionMessage[];
  }

  if (messages && typeof messages === "object" && Array.isArray((messages as { records?: EvolutionMessage[] }).records)) {
    return (messages as { records: EvolutionMessage[] }).records;
  }

  return [];
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

function normalizeBase64Response(data: unknown): EvolutionMediaBase64 | null {
  const records = [
    data,
    (data as { data?: unknown } | null)?.data,
    (data as { response?: unknown } | null)?.response,
    (data as { media?: unknown } | null)?.media
  ].filter(Boolean);

  for (const record of records) {
    if (!record || typeof record !== "object") continue;
    const item = record as Record<string, unknown>;
    const base64 =
      pickString(item.base64) ??
      pickString(item.base64Message) ??
      pickString(item.file) ??
      pickString(item.data);

    if (!base64) continue;

    return {
      base64,
      mimetype: pickString(item.mimetype) ?? pickString(item.mimeType) ?? pickString(item.mediaType),
      fileName: pickString(item.fileName) ?? pickString(item.filename) ?? pickString(item.name),
      size: pickNumber(item.size) ?? pickNumber(item.fileLength)
    };
  }

  return null;
}

export async function getBase64FromMediaMessage(input: {
  message: EvolutionMessage | Record<string, unknown>;
  convertToMp4?: boolean;
}): Promise<EvolutionMediaBase64 | null> {
  const env = getEnv();
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
    console.warn("[evolution-media] Evolution API nao configurada");
    return null;
  }

  const instanceName = await resolveInstanceName();
  if (!instanceName) {
    console.warn("[evolution-media] instancia Evolution nao encontrada");
    return null;
  }

  const response = await fetch(
    `${env.evolutionApiUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolutionApiKey
      },
      body: JSON.stringify({
        message: input.message,
        convertToMp4: input.convertToMp4 ?? false
      }),
      cache: "no-store"
    }
  );

  if (!response.ok) {
    console.warn("[evolution-media] failed to fetch base64", {
      status: response.status,
      statusText: response.statusText
    });
    return null;
  }

  const data = await response.json().catch(() => null);
  const normalized = normalizeBase64Response(data);
  if (!normalized) {
    console.warn("[evolution-media] base64 response missing media payload");
  }

  return normalized;
}
