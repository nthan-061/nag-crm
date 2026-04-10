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
  matchType: "exact" | "variant" | "suffix" | null;
  possibleMatches: Array<{
    source: "instance" | "crm";
    phone: string;
    name: string;
    jid: string | null;
    leadId: string | null;
    hasCard: boolean;
    matchType: "variant" | "suffix";
  }>;
  status:
    | "missing_everywhere"
    | "instance_only"
    | "crm_only"
    | "crm_without_card"
    | "synced"
    | "possible_match";
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

function generatePhoneVariants(digits: string): Set<string> {
  const variants = new Set<string>([digits]);

  function addBrazilianVariants(value: string) {
    if (value.startsWith("55")) {
      const local = value.slice(2);
      variants.add(local);

      if (local.length === 11) {
        variants.add(`${local.slice(0, 2)}${local.slice(3)}`);
      }
      if (local.length === 10) {
        variants.add(`${local.slice(0, 2)}9${local.slice(2)}`);
      }
    } else {
      variants.add(`55${value}`);

      if (value.length === 11) {
        variants.add(`${value.slice(0, 2)}${value.slice(3)}`);
        variants.add(`55${value.slice(0, 2)}${value.slice(3)}`);
      }
      if (value.length === 10) {
        variants.add(`${value.slice(0, 2)}9${value.slice(2)}`);
        variants.add(`55${value.slice(0, 2)}9${value.slice(2)}`);
      }
    }
  }

  addBrazilianVariants(digits);
  return variants;
}

function getSuffixes(digits: string): string[] {
  return [digits.slice(-11), digits.slice(-10), digits.slice(-9), digits.slice(-8)].filter(
    (value) => value.length >= 8
  );
}

function getPhoneMatchType(inputDigits: string, candidateDigits: string): "exact" | "variant" | "suffix" | null {
  if (inputDigits === candidateDigits) return "exact";

  const inputVariants = generatePhoneVariants(inputDigits);
  const candidateVariants = generatePhoneVariants(candidateDigits);
  if ([...inputVariants].some((value) => candidateVariants.has(value))) {
    return "variant";
  }

  const inputSuffixes = getSuffixes(inputDigits);
  const candidateSuffixes = getSuffixes(candidateDigits);
  if (
    inputSuffixes.some((suffix) => candidateDigits.endsWith(suffix)) ||
    candidateSuffixes.some((suffix) => inputDigits.endsWith(suffix))
  ) {
    return "suffix";
  }

  return null;
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
  const matchedChats = chats
    .map((chat) => {
      const jid = chat.remoteJid ?? null;
      if (!jid || !isPersonalJid(jid)) return null;
      const phone = normalizePhoneFromJid(jid);
      if (!phone) return null;
      const matchType = getPhoneMatchType(normalizedPhone, phone);
      if (!matchType) return null;
      return { chat, jid, phone, matchType };
    })
    .filter(
      (
        item
      ): item is {
        chat: Awaited<ReturnType<typeof fetchInstanceChats>>[number];
        jid: string;
        phone: string;
        matchType: "exact" | "variant" | "suffix";
      } => item !== null
    )
    .sort((a, b) => {
      const score = { exact: 0, variant: 1, suffix: 2 };
      return score[a.matchType] - score[b.matchType];
    });

  const matchedChat = matchedChats.find((item) => item.matchType === "exact") ?? matchedChats[0] ?? null;

  const supabase = createSupabaseAdminClient();
  const { data: leads, error: leadsError } = await supabase
    .from("leads")
    .select("id, nome, telefone, deleted_at")
    .order("criado_em", { ascending: false });
  if (leadsError) throw leadsError;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("id, lead_id");
  if (cardsError) throw cardsError;

  const cardByLeadId = new Map((cards ?? []).map((card) => [card.lead_id, card.id]));

  const matchedLeads = (leads ?? [])
    .map((lead) => {
      const matchType = getPhoneMatchType(normalizedPhone, lead.telefone);
      if (!matchType) return null;
      return {
        lead,
        matchType,
        hasCard: cardByLeadId.has(lead.id),
        cardId: cardByLeadId.get(lead.id) ?? null,
      };
    })
    .filter(
      (
        item
      ): item is {
        lead: {
          id: string;
          nome: string;
          telefone: string;
          deleted_at: string | null;
        };
        matchType: "exact" | "variant" | "suffix";
        hasCard: boolean;
        cardId: string | null;
      } => item !== null
    )
    .sort((a, b) => {
      const score = { exact: 0, variant: 1, suffix: 2 };
      return score[a.matchType] - score[b.matchType];
    });

  const matchedLead = matchedLeads.find((item) => item.matchType === "exact") ?? matchedLeads[0] ?? null;

  let messageCount = 0;
  if (matchedLead?.lead.id) {
    const { count, error: messageError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("lead_id", matchedLead.lead.id);
    if (messageError) throw messageError;
    messageCount = count ?? 0;
  }

  const foundInInstance = !!matchedChat;
  const foundInCrm = !!matchedLead;
  const hasCard = !!matchedLead?.hasCard;
  const cardId = matchedLead?.cardId ?? null;
  const matchType =
    matchedLead?.matchType === "exact"
      ? matchedLead.matchType
      : matchedChat?.matchType === "exact"
        ? matchedChat.matchType
        : matchedLead?.matchType ?? matchedChat?.matchType ?? null;

  let status: ContactLookupResult["status"];
  if (matchType && matchType !== "exact") {
    status = "possible_match";
  } else if (foundInInstance && foundInCrm && hasCard) {
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
    jid: matchedChat?.jid ?? null,
    instanceName: matchedChat?.chat.name ?? matchedChat?.chat.pushName ?? matchedChat?.chat.profileName ?? null,
    lastTimestamp:
      typeof matchedChat?.chat.timestamp === "number"
        ? matchedChat.chat.timestamp
        : typeof matchedChat?.chat.lastMessage?.messageTimestamp === "number"
          ? matchedChat.chat.lastMessage.messageTimestamp
          : null,
    lead: matchedLead?.lead
      ? {
          id: matchedLead.lead.id,
          nome: matchedLead.lead.nome,
          deletedAt: matchedLead.lead.deleted_at,
        }
      : null,
    hasCard,
    cardId,
    messageCount,
    matchType,
    possibleMatches: [
      ...matchedChats
        .filter((item) => item.matchType !== "exact")
        .slice(0, 5)
        .map((item) => ({
          source: "instance" as const,
          phone: item.phone,
          name: item.chat.name ?? item.chat.pushName ?? item.chat.profileName ?? `+${item.phone}`,
          jid: item.jid,
          leadId: null,
          hasCard: false,
          matchType: item.matchType as "variant" | "suffix",
        })),
      ...matchedLeads
        .filter((item) => item.matchType !== "exact")
        .slice(0, 5)
        .map((item) => ({
          source: "crm" as const,
          phone: item.lead.telefone,
          name: item.lead.nome,
          jid: null,
          leadId: item.lead.id,
          hasCard: item.hasCard,
          matchType: item.matchType as "variant" | "suffix",
        })),
    ],
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
