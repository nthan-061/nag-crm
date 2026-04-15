import { isLeadNote } from "@/lib/notes";
import type { Message, OperationalMetrics, ResponseStatus } from "@/lib/types/database";

export function getSlaBucket(waitHours: number | null): ResponseStatus["slaBucket"] {
  if (waitHours === null) return "none";
  if (waitHours >= 72) return "72h";
  if (waitHours >= 48) return "48h";
  if (waitHours >= 24) return "24h";
  return "none";
}

export function getLeadResponseStatus(messages: Message[], now = new Date()): ResponseStatus {
  const latest = [...messages]
    .filter((message) => !isLeadNote(message.conteudo))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

  if (!latest) {
    return {
      needsResponse: false,
      lastMessageType: null,
      lastMessageAt: null,
      waitHours: null,
      slaBucket: "none"
    };
  }

  const lastMessageAt = latest.timestamp;
  const waitHours = Math.max(0, Math.floor((now.getTime() - new Date(lastMessageAt).getTime()) / 36e5));
  const needsResponse = latest.tipo === "entrada";

  return {
    needsResponse,
    lastMessageType: latest.tipo,
    lastMessageAt,
    waitHours,
    slaBucket: needsResponse ? getSlaBucket(waitHours) : "none"
  };
}

export function getConversationStatesByLeadIds(messages: Message[], now = new Date()) {
  const byLead = new Map<string, Message[]>();
  for (const message of messages) {
    const current = byLead.get(message.lead_id) ?? [];
    current.push(message);
    byLead.set(message.lead_id, current);
  }

  return new Map([...byLead.entries()].map(([leadId, leadMessages]) => [leadId, getLeadResponseStatus(leadMessages, now)]));
}

export function getOperationalMetrics(statuses: Iterable<ResponseStatus>): OperationalMetrics {
  const metrics: OperationalMetrics = {
    needsResponse: 0,
    stale24h: 0,
    stale48h: 0,
    stale72h: 0
  };

  for (const status of statuses) {
    if (!status.needsResponse) continue;
    metrics.needsResponse += 1;
    if ((status.waitHours ?? 0) >= 24) metrics.stale24h += 1;
    if ((status.waitHours ?? 0) >= 48) metrics.stale48h += 1;
    if ((status.waitHours ?? 0) >= 72) metrics.stale72h += 1;
  }

  return metrics;
}
