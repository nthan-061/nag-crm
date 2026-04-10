import { getEnv } from "@/lib/env";

// ─── Types ────────────────────────────────────────────────────────────────────

export type EvolutionChat = {
  id: string;
  name?: string;
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
      method: "GET",
      headers: { apikey: env.evolutionApiKey },
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
    : ((data as { messages?: EvolutionMessage[] })?.messages ?? []);
  return messages as EvolutionMessage[];
}
