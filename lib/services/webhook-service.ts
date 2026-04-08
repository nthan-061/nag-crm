import { DEFAULT_ENTRY_COLUMN } from "@/lib/constants";
import { createCard, getEntryColumnId, touchCard } from "@/lib/repositories/cards-repository";
import { createLead, findLeadByPhone } from "@/lib/repositories/leads-repository";
import { createMessage } from "@/lib/repositories/messages-repository";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { webhookMessageSchema } from "@/lib/validations/webhook";

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

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, "");
}

function extractMessageContent(message: Record<string, unknown> | undefined) {
  if (!message) return "Mensagem recebida";

  return (
    (message.conversation as string | undefined) ??
    ((message.extendedTextMessage as { text?: string } | undefined)?.text ?? undefined) ??
    ((message.imageMessage as { caption?: string } | undefined)?.caption ?? undefined) ??
    "Mensagem recebida"
  );
}

function extractMessageId(candidate: WebhookCandidate): string | undefined {
  return candidate.key?.id ?? undefined;
}

function extractPhoneFromCandidate(candidate: WebhookCandidate) {
  const raw =
    candidate.cleanedSenderPn ??
    candidate.senderPn ??
    candidate.key?.senderPn ??
    candidate.key?.remoteJid ??
    candidate.key?.participant ??
    candidate.remoteJid;

  if (!raw) return "";
  return normalizePhone(raw.split("@")[0] ?? raw);
}

function normalizeWebhookMessage(payload: any): WebhookCandidate {
  const candidates: WebhookCandidate[] = [];

  if (payload?.data?.messages?.length) {
    for (const message of payload.data.messages) {
      candidates.push({
        ...message,
        pushName: message.pushName ?? payload.data.pushName ?? payload.pushName,
        messageTimestamp:
          message.messageTimestamp ?? payload.data.messageTimestamp ?? payload.messageTimestamp ?? payload.timestamp
      });
    }
  }

  if (payload?.data && (payload.data.key || payload.data.message)) {
    candidates.push(payload.data);
  }

  if (payload?.key || payload?.message) {
    candidates.push(payload);
  }

  const inboundCandidate =
    candidates.find((candidate) => candidate?.key?.fromMe === false && extractPhoneFromCandidate(candidate)) ??
    candidates.find((candidate) => candidate?.key?.fromMe !== true && extractPhoneFromCandidate(candidate));

  if (!inboundCandidate) {
    throw new Error("Nenhuma mensagem de entrada valida encontrada no payload");
  }

  return inboundCandidate;
}

export async function processWhatsappWebhook(payload: unknown) {
  await ensureDefaultPipeline();
  const parsed = webhookMessageSchema.parse(payload);
  const inboundMessage = normalizeWebhookMessage(parsed);
  const telefone = extractPhoneFromCandidate(inboundMessage);

  if (!telefone) throw new Error("Telefone nao encontrado no payload");

  const rawTimestamp = inboundMessage.messageTimestamp ?? inboundMessage.timestamp;
  const timestamp = rawTimestamp
    ? new Date(Number(rawTimestamp) * 1000 || Number(rawTimestamp)).toISOString()
    : new Date().toISOString();
  const nome = inboundMessage.pushName?.trim() || `Lead ${telefone}`;
  const conteudo = extractMessageContent(inboundMessage.message);
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
        ultima_interacao: timestamp
      });
    } catch {
      // Race condition: outro webhook criou o lead ao mesmo tempo
      lead = await findLeadByPhone(telefone);
    }
  }

  if (!lead) throw new Error("Falha ao criar ou localizar lead");

  const supabase = createSupabaseAdminClient();
  const { data: card } = await (supabase
    .from("cards") as any)
    .select("id, coluna_id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  const createdMessage = await createMessage({
    lead_id: lead.id,
    conteudo,
    tipo: "entrada",
    timestamp,
    external_id: externalId
  });

  if (!createdMessage) {
    // Mensagem duplicada — retornar 200 para Evolution parar de retentar
    return { ok: true, leadId: lead.id, duplicate: true };
  }

  if ((card as unknown as { id: string } | null)?.id) {
    await touchCard((card as unknown as { id: string }).id, timestamp);
  }

  let cardColumn = DEFAULT_ENTRY_COLUMN;
  const colunaId = (card as unknown as { coluna_id?: string } | null)?.coluna_id;
  if (colunaId) {
    const { data: column } = await (supabase.from("columns") as any).select("nome").eq("id", colunaId).maybeSingle();
    cardColumn = (column as unknown as { nome?: string } | null)?.nome ?? DEFAULT_ENTRY_COLUMN;
  }

  return {
    ok: true,
    leadId: lead.id,
    cardColumn,
    messageId: createdMessage.id
  };
}
