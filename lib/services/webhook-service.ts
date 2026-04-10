import { DEFAULT_ENTRY_COLUMN } from "@/lib/constants";
import { createCard, getEntryColumnId, touchCard } from "@/lib/repositories/cards-repository";
import { createLead, findLeadByPhone } from "@/lib/repositories/leads-repository";
import { createMessage } from "@/lib/repositories/messages-repository";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { webhookMessageSchema, type WebhookMessage } from "@/lib/validations/webhook";

// ─── Types ────────────────────────────────────────────────────────────────────

type WebhookCandidate = {
  key?: {
    remoteJid?: string;
    fromMe?: boolean;
    id?: string;
    participant?: string;
    senderPn?: string;
  };
  remoteJid?: string;
  senderPn?: string;
  cleanedSenderPn?: string;
  pushName?: string;
  message?: Record<string, unknown>;
  messageType?: string;
  messageTimestamp?: string | number;
  timestamp?: string | number;
};

// ─── Event denylist ───────────────────────────────────────────────────────────
// These Evolution API events are known to never carry real message data.
// Everything NOT in this list is allowed through to the content/phone validators.
// Using a denylist (not an allowlist) avoids blocking events whose names vary
// across Evolution API versions or configurations.
const NON_MESSAGE_EVENTS = new Set([
  "QRCODE_UPDATED",
  "qrcode.updated",
  "CONNECTION_UPDATE",
  "connection.update",
  "PRESENCE_UPDATE",
  "presence.update",
  "CHATS_UPDATE",
  "chats.update",
  "CHATS_SET",
  "chats.set",
  "CONTACTS_UPDATE",
  "contacts.update",
  "CONTACTS_SET",
  "contacts.set",
  "CALL",
  "call",
  "GROUPS_UPDATE",
  "groups.update",
  "GROUPS_UPSERT",
  "groups.upsert",
  "GROUP_PARTICIPANTS_UPDATE",
  "group-participants.update",
  "LABELS_EDIT",
  "labels.edit",
  "LABELS_ASSOCIATION",
  "labels.association",
]);

// ─── Phone validation ─────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Returns the normalized phone number only if it looks like a real phone.
 * Rejects:
 *  - status@broadcast (WhatsApp system JIDs)
 *  - group JIDs ending in @g.us
 *  - lid JIDs ending in @lid
 *  - numbers shorter than 8 digits (not a real phone)
 *  - numbers longer than 15 digits (beyond E.164 max)
 */
function extractValidPhone(raw: string | undefined): string | null {
  if (!raw) return null;
  const jid = raw.toLowerCase();
  if (jid.includes("@g.us")) return null;     // group
  if (jid.includes("@lid")) return null;      // linked device
  if (jid.includes("broadcast")) return null; // broadcast list
  if (jid.includes("@newsletter")) return null;

  const digits = normalizePhone(raw.split("@")[0] ?? raw);
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

function extractPhoneFromCandidate(candidate: WebhookCandidate): string | null {
  const sources = [
    candidate.cleanedSenderPn,
    candidate.senderPn,
    candidate.key?.senderPn,
    candidate.key?.remoteJid,
    candidate.key?.participant,
    candidate.remoteJid,
  ];
  for (const src of sources) {
    if (!src) continue;
    const phone = extractValidPhone(src);
    if (phone) return phone;
  }
  return null;
}

// ─── Message content extraction ──────────────────────────────────────────────

function unwrapMessage(
  message: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (!message) return undefined;
  const ephemeral = message.ephemeralMessage as { message?: Record<string, unknown> } | undefined;
  if (ephemeral?.message) return unwrapMessage(ephemeral.message);
  const viewOnce = message.viewOnceMessage as { message?: Record<string, unknown> } | undefined;
  if (viewOnce?.message) return unwrapMessage(viewOnce.message);
  return message;
}

/**
 * Returns the displayable content of a WhatsApp message, or null if the
 * payload does not represent a real user-initiated message.
 *
 * Returning null means: do NOT create a lead or message record.
 */
function extractMessageContent(
  message: Record<string, unknown> | undefined
): string | null {
  const payload = unwrapMessage(message);
  if (!payload) return null;

  // Text messages
  const conversation = payload.conversation;
  if (typeof conversation === "string" && conversation.trim()) {
    return conversation.trim();
  }

  const extendedText = (payload.extendedTextMessage as { text?: string } | undefined)?.text;
  if (typeof extendedText === "string" && extendedText.trim()) {
    return extendedText.trim();
  }

  // Media messages — accepted with placeholder content
  const imageCaption = (payload.imageMessage as { caption?: string } | undefined)?.caption;
  if (typeof imageCaption === "string" && imageCaption.trim()) return imageCaption.trim();
  if (payload.imageMessage) return "[Imagem recebida]";

  if (payload.videoMessage) return "[Video recebido]";
  if (payload.audioMessage || payload.pttMessage) return "[Audio recebido]";
  if (payload.documentMessage) return "[Documento recebido]";
  if (payload.stickerMessage) return "[Sticker recebido]";
  if (payload.contactMessage) return "[Contato recebido]";
  if (payload.locationMessage) return "[Localizacao recebida]";

  // Interactive response messages — contacts who tap buttons/polls count as leads
  const reaction = payload.reactionMessage as { text?: string } | undefined;
  if (reaction?.text) return `[Reagiu: ${reaction.text}]`;
  if (payload.reactionMessage) return "[Reacao recebida]";

  const buttonResponse = payload.buttonsResponseMessage as { selectedDisplayText?: string } | undefined;
  if (buttonResponse?.selectedDisplayText) return `[Respondeu: ${buttonResponse.selectedDisplayText}]`;

  const listResponse = payload.listResponseMessage as { title?: string } | undefined;
  if (listResponse?.title) return `[Selecionou: ${listResponse.title}]`;

  const templateReply = payload.templateButtonReplyMessage as { selectedDisplayText?: string } | undefined;
  if (templateReply?.selectedDisplayText) return `[Respondeu: ${templateReply.selectedDisplayText}]`;

  const pollCreation = payload.pollCreationMessage as { name?: string } | undefined;
  if (pollCreation?.name) return `[Enquete: ${pollCreation.name}]`;

  if (payload.pollUpdateMessage) return "[Votou em enquete]";

  // Anything else (protocol messages, status updates, etc.)
  // — return null so the event is ignored without creating data
  return null;
}

function extractMessageId(candidate: WebhookCandidate): string | undefined {
  return candidate.key?.id ?? undefined;
}

// ─── Candidate collection ─────────────────────────────────────────────────────

function collectCandidates(parsed: WebhookMessage): WebhookCandidate[] {
  const candidates: WebhookCandidate[] = [];

  if (Array.isArray(parsed?.data)) {
    for (const message of parsed.data) {
      candidates.push({
        ...message,
        pushName: message.pushName ?? parsed.pushName,
        messageTimestamp: message.messageTimestamp ?? parsed.messageTimestamp ?? parsed.timestamp,
      });
    }
  } else {
    if (parsed?.data?.messages?.length) {
      for (const message of parsed.data.messages) {
        candidates.push({
          ...message,
          pushName: message.pushName ?? parsed.data.pushName ?? parsed.pushName,
          messageTimestamp:
            message.messageTimestamp ??
            parsed.data.messageTimestamp ??
            parsed.messageTimestamp ??
            parsed.timestamp,
        });
      }
    }
    if (parsed?.data && (parsed.data.key || parsed.data.message)) {
      candidates.push(parsed.data);
    }
  }

  if (parsed?.key || parsed?.message) {
    candidates.push(parsed);
  }

  return candidates;
}

/**
 * Returns a valid inbound candidate — one that:
 * - is NOT fromMe
 * - has a real phone number
 * - has real message content
 */
function normalizeWebhookMessage(parsed: WebhookMessage): WebhookCandidate | null {
  const candidates = collectCandidates(parsed);

  for (const c of candidates) {
    if (c?.key?.fromMe === true) continue;
    if (!extractPhoneFromCandidate(c)) continue;
    if (!extractMessageContent(c.message)) continue;
    return c;
  }

  // Second pass: relax fromMe check (undefined = unknown, treat as inbound)
  for (const c of candidates) {
    if (c?.key?.fromMe === true) continue;
    const phone = extractPhoneFromCandidate(c);
    if (!phone) continue;
    const content = extractMessageContent(c.message);
    if (!content) continue;
    return c;
  }

  return null;
}

/**
 * Returns a valid outbound candidate — one that:
 * - IS fromMe === true
 * - has a real phone number
 * - has real message content
 */
function extractOutboundCandidate(parsed: WebhookMessage): WebhookCandidate | null {
  const candidates = collectCandidates(parsed);
  for (const c of candidates) {
    if (c?.key?.fromMe !== true) continue;
    if (!extractPhoneFromCandidate(c)) continue;
    if (!extractMessageContent(c.message)) continue;
    return c;
  }
  return null;
}

// ─── Timestamp normalization ──────────────────────────────────────────────────

function toISOTimestamp(raw: string | number | undefined): string {
  if (!raw) return new Date().toISOString();
  const n = Number(raw);
  // Evolution sends Unix seconds (10 digits); JS timestamps are ms (13 digits)
  const ms = n > 9_999_999_999 ? n : n * 1000;
  const date = new Date(ms);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function processWhatsappWebhook(payload: unknown) {
  await ensureDefaultPipeline();
  const parsed = webhookMessageSchema.parse(payload);

  // Gate 1: skip known non-message events (CONNECTION_UPDATE, QRCODE_UPDATED, etc.)
  // Using a denylist so unknown/version-specific event names still pass through
  // to the content+phone validators (Gates 2 & 3) which are the real protection.
  const event = parsed.event;
  if (event && NON_MESSAGE_EVENTS.has(event)) {
    console.log("[webhook] ignored non-message event:", event);
    return { ok: true, skipped: true, reason: "non_message_event", event };
  }

  const inboundMessage = normalizeWebhookMessage(parsed);

  if (!inboundMessage) {
    // Gate 2: check if this is an outbound message sent from the phone
    const outboundMessage = extractOutboundCandidate(parsed);
    if (outboundMessage) {
      const telefone = extractPhoneFromCandidate(outboundMessage);
      if (telefone) {
        const lead = await findLeadByPhone(telefone);
        if (lead) {
          const timestamp = toISOTimestamp(outboundMessage.messageTimestamp ?? outboundMessage.timestamp);
          const conteudo = extractMessageContent(outboundMessage.message);
          if (!conteudo) {
            console.log("[webhook] outbound message has no content, skipping");
            return { ok: true, skipped: true, reason: "outbound_no_content" };
          }
          const externalId = extractMessageId(outboundMessage);

          const createdMessage = await createMessage({
            lead_id: lead.id,
            conteudo,
            tipo: "saida",
            timestamp,
            external_id: externalId,
          });

          if (!createdMessage) {
            return { ok: true, leadId: lead.id, duplicate: true };
          }

          const supabase = createSupabaseAdminClient();
          const { data: card } = await supabase
            .from("cards")
            .select("id")
            .eq("lead_id", lead.id)
            .maybeSingle();
          if (card?.id) await touchCard(card.id, timestamp);

          console.log("[webhook] outbound message saved for existing lead:", lead.id);
          return { ok: true, leadId: lead.id, outbound: true, messageId: createdMessage.id };
        }
      }
      // Outbound for unknown phone — do not create lead
      console.log("[webhook] outbound message for unknown phone, skipping");
      return { ok: true, skipped: true, reason: "outbound_unknown_lead" };
    }

    console.log("[webhook] no valid inbound or outbound candidate found, skipping");
    return { ok: true, skipped: true, reason: "no_candidate" };
  }

  // Gate 3: verified inbound message — extract and validate all fields
  const telefone = extractPhoneFromCandidate(inboundMessage);
  if (!telefone) {
    console.log("[webhook] inbound candidate has no valid phone, skipping");
    return { ok: true, skipped: true, reason: "no_valid_phone" };
  }

  const conteudo = extractMessageContent(inboundMessage.message);
  if (!conteudo) {
    // This should not happen (normalizeWebhookMessage already checks content)
    // but guard anyway to never create a lead without real content.
    console.log("[webhook] inbound candidate has no content, skipping");
    return { ok: true, skipped: true, reason: "no_content" };
  }

  const timestamp = toISOTimestamp(inboundMessage.messageTimestamp ?? inboundMessage.timestamp);
  const nome = inboundMessage.pushName?.trim() || `Lead ${telefone}`;
  const externalId = extractMessageId(inboundMessage);

  let lead = await findLeadByPhone(telefone);

  if (!lead) {
    try {
      lead = await createLead({ nome, telefone, origem: "whatsapp" });
      const entryColumnId = await getEntryColumnId();
      await createCard({
        lead_id: lead.id,
        coluna_id: entryColumnId,
        prioridade: "media",
        ultima_interacao: timestamp,
      });
      console.log("[webhook] new lead created:", lead.id, telefone);
    } catch (err) {
      // Race condition: another request already created the lead concurrently.
      console.warn("[webhook] race or error creating lead/card:", err instanceof Error ? err.message : String(err));
      lead = await findLeadByPhone(telefone);
    }
  }

  if (!lead) {
    throw new Error("Falha ao criar ou localizar lead");
  }

  const supabase = createSupabaseAdminClient();
  const { data: card } = await supabase
    .from("cards")
    .select("id, coluna_id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  // Recovery: lead exists but has no card — create one now so it appears in Kanban.
  if (!card) {
    console.warn("[webhook] lead exists without card, recovering:", lead.id);
    try {
      const entryColumnId = await getEntryColumnId();
      await createCard({
        lead_id: lead.id,
        coluna_id: entryColumnId,
        prioridade: "media",
        ultima_interacao: timestamp,
      });
    } catch (err) {
      console.warn("[webhook] failed to recover missing card:", err instanceof Error ? err.message : String(err));
    }
  }

  const createdMessage = await createMessage({
    lead_id: lead.id,
    conteudo,
    tipo: "entrada",
    timestamp,
    external_id: externalId,
  });

  if (!createdMessage) {
    console.log("[webhook] duplicate message, skipping:", externalId);
    return { ok: true, leadId: lead.id, duplicate: true };
  }

  if (card?.id) {
    await touchCard(card.id, timestamp);
  }

  let cardColumn = DEFAULT_ENTRY_COLUMN;
  if (card?.coluna_id) {
    const { data: column } = await supabase
      .from("columns")
      .select("nome")
      .eq("id", card.coluna_id)
      .maybeSingle();
    cardColumn = column?.nome ?? DEFAULT_ENTRY_COLUMN;
  }

  console.log("[webhook] inbound message processed:", {
    leadId: lead.id,
    messageId: createdMessage.id,
    cardColumn,
    telefone,
  });

  return {
    ok: true,
    leadId: lead.id,
    cardColumn,
    messageId: createdMessage.id,
  };
}
