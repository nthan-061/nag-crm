import { createCard, getEntryColumnId } from "@/lib/repositories/cards-repository";
import { createLead, findLeadByPhone } from "@/lib/repositories/leads-repository";
import { createMessage } from "@/lib/repositories/messages-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  fetchInstanceChats,
  fetchContactMessages,
  type EvolutionMessage,
} from "@/lib/services/evolution-client";

// ─── Types ────────────────────────────────────────────────────────────────────

export type MissingContact = {
  jid: string;
  phone: string;
  name: string;
  lastTimestamp: number | null;
};

export type ImportContactResult = {
  leadId: string;
  messagesImported: number;
  cardCreated: boolean;
};

export type ContactLookupResult = {
  normalizedPhone: string;
  foundInInstance: boolean;
  foundInCrm: boolean;
  jid: string | null;
  instanceName: string | null;
  lastTimestamp: number | null;
  lead: {
    id: string;
    nome: string;
    deletedAt: string | null;
  } | null;
  hasCard: boolean;
  cardId: string | null;
  messageCount: number;
  status:
    | "missing_everywhere"
    | "instance_only"
    | "crm_only"
    | "crm_without_card"
    | "synced";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizePhoneFromJid(jid: string): string | null {
  const digits = (jid.split("@")[0] ?? "").replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function normalizePhoneInput(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function isPersonalJid(jid: string): boolean {
  const lower = jid.toLowerCase();
  return (
    (lower.includes("@s.whatsapp.net") || lower.includes("@c.us")) &&
    !lower.includes("@g.us") &&
    !lower.includes("@lid") &&
    !lower.includes("broadcast")
  );
}

function extractTextFromMessage(msg: EvolutionMessage): string | null {
  const m = msg.message;
  if (!m) return null;

  const conversation = m.conversation;
  if (typeof conversation === "string" && conversation.trim()) return conversation.trim();

  const extendedText = (m.extendedTextMessage as { text?: string } | undefined)?.text;
  if (typeof extendedText === "string" && extendedText.trim()) return extendedText.trim();

  if (m.imageMessage) return "[Imagem]";
  if (m.videoMessage) return "[Video]";
  if (m.audioMessage || m.pttMessage) return "[Audio]";
  if (m.documentMessage) return "[Documento]";
  if (m.stickerMessage) return "[Sticker]";

  return null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetches all chats from the Evolution instance and returns those whose phone
 * number is not yet present as a lead in the CRM, sorted by most recent first.
 */
export async function findMissingContacts(): Promise<MissingContact[]> {
  const chats = await fetchInstanceChats();

  const supabase = createSupabaseAdminClient();
  const { data: leads, error } = await supabase
    .from("leads")
    .select("telefone")
    .is("deleted_at", null);
  if (error) throw error;

  const existingPhones = new Set((leads ?? []).map((l) => l.telefone));

  const missing: MissingContact[] = [];
  for (const chat of chats) {
    const jid = chat.remoteJid ?? null;
    if (!jid || !isPersonalJid(jid)) continue;

    const phone = normalizePhoneFromJid(jid);
    if (!phone) continue;
    if (existingPhones.has(phone)) continue;

    const ts =
      typeof chat.timestamp === "number"
        ? chat.timestamp
        : typeof chat.lastMessage?.messageTimestamp === "number"
          ? chat.lastMessage.messageTimestamp
          : null;

    missing.push({
      jid,
      phone,
      name: chat.name ?? chat.pushName ?? chat.profileName ?? `+${phone}`,
      lastTimestamp: ts
    });
  }

  missing.sort((a, b) => (b.lastTimestamp ?? 0) - (a.lastTimestamp ?? 0));
  return missing;
}

export async function lookupContact(phoneInput: string): Promise<ContactLookupResult> {
  const normalizedPhone = normalizePhoneInput(phoneInput);
  if (!normalizedPhone) {
    throw new Error("Informe um numero valido com DDD e, se necessario, codigo do pais.");
  }

  const chats = await fetchInstanceChats();
  const matchedChat = chats.find((chat) => {
    const jid = chat.remoteJid ?? null;
    if (!jid || !isPersonalJid(jid)) return false;
    return normalizePhoneFromJid(jid) === normalizedPhone;
  });

  const supabase = createSupabaseAdminClient();
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, nome, deleted_at")
    .eq("telefone", normalizedPhone)
    .maybeSingle();
  if (leadError) throw leadError;

  let cardId: string | null = null;
  if (lead?.id) {
    const { data: card, error: cardError } = await supabase
      .from("cards")
      .select("id")
      .eq("lead_id", lead.id)
      .maybeSingle();
    if (cardError) throw cardError;
    cardId = card?.id ?? null;
  }

  let messageCount = 0;
  if (lead?.id) {
    const { count, error: messageError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", lead.id);
    if (messageError) throw messageError;
    messageCount = count ?? 0;
  }

  const foundInInstance = !!matchedChat;
  const foundInCrm = !!lead;
  const hasCard = !!cardId;

  let status: ContactLookupResult["status"];
  if (foundInInstance && foundInCrm && hasCard) {
    status = "synced";
  } else if (foundInInstance && foundInCrm && !hasCard) {
    status = "crm_without_card";
  } else if (foundInInstance && !foundInCrm) {
    status = "instance_only";
  } else if (!foundInInstance && foundInCrm) {
    status = "crm_only";
  } else {
    status = "missing_everywhere";
  }

  return {
    normalizedPhone,
    foundInInstance,
    foundInCrm,
    jid: matchedChat?.remoteJid ?? null,
    instanceName: matchedChat?.name ?? matchedChat?.pushName ?? matchedChat?.profileName ?? null,
    lastTimestamp:
      typeof matchedChat?.timestamp === "number"
        ? matchedChat.timestamp
        : typeof matchedChat?.lastMessage?.messageTimestamp === "number"
          ? matchedChat.lastMessage.messageTimestamp
          : null,
    lead: lead
      ? {
          id: lead.id,
          nome: lead.nome,
          deletedAt: lead.deleted_at,
        }
      : null,
    hasCard,
    cardId,
    messageCount,
    status,
  };
}

/**
 * Creates (or finds) a lead for the given JID + phone, ensures a kanban card
 * exists, and backfills recent messages from the Evolution instance.
 */
export async function importContact(
  jid: string,
  phone: string,
  name: string
): Promise<ImportContactResult> {
  // Upsert lead
  let lead = await findLeadByPhone(phone);
  if (!lead) {
    lead = await createLead({ nome: name, telefone: phone, origem: "whatsapp" });
  }

  // Ensure the lead has a kanban card
  const supabase = createSupabaseAdminClient();
  const { data: existingCard } = await supabase
    .from("cards")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  let cardCreated = false;
  if (!existingCard) {
    const entryColumnId = await getEntryColumnId();
    await createCard({ lead_id: lead.id, coluna_id: entryColumnId, prioridade: "media" });
    cardCreated = true;
  }

  // Back-fill recent messages (non-fatal if the Evolution call fails)
  let messagesImported = 0;
  try {
    const evolutionMessages = await fetchContactMessages(jid, 50);
    for (const msg of evolutionMessages) {
      if (!msg.key?.id) continue;
      const content = extractTextFromMessage(msg);
      if (!content) continue;

      const rawTs = msg.messageTimestamp;
      const ts = rawTs
        ? new Date(rawTs > 9_999_999_999 ? rawTs : rawTs * 1000).toISOString()
        : new Date().toISOString();

      const created = await createMessage({
        lead_id: lead.id,
        conteudo: content,
        tipo: msg.key.fromMe ? "saida" : "entrada",
        timestamp: ts,
        external_id: msg.key.id,
      });
      if (created) messagesImported++;
    }
  } catch (err) {
    console.warn("[reconciliation] failed to import messages for", jid, err instanceof Error ? err.message : err);
  }

  return { leadId: lead.id, messagesImported, cardCreated };
}
