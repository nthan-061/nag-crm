import { DEFAULT_ENTRY_COLUMN } from "@/lib/constants";
import { createCard, getEntryColumnId, touchCard } from "@/lib/repositories/cards-repository";
import { createLead, findLeadByPhone } from "@/lib/repositories/leads-repository";
import { createMessage } from "@/lib/repositories/messages-repository";
import { ensureDefaultPipeline } from "@/lib/repositories/pipeline-repository";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { webhookMessageSchema } from "@/lib/validations/webhook";

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

export async function processWhatsappWebhook(payload: unknown) {
  await ensureDefaultPipeline();
  const parsed = webhookMessageSchema.parse(payload);
  const remoteJid = parsed.data.key?.remoteJid ?? "";
  const telefone = normalizePhone(remoteJid.split("@")[0] ?? "");

  if (!telefone) throw new Error("Telefone nao encontrado no payload");

  const timestamp = parsed.data.messageTimestamp
    ? new Date(Number(parsed.data.messageTimestamp) * 1000).toISOString()
    : new Date().toISOString();
  const nome = parsed.data.pushName?.trim() || `Lead ${telefone}`;
  const conteudo = extractMessageContent(parsed.data.message);

  let lead = await findLeadByPhone(telefone);

  if (!lead) {
    lead = await createLead({ nome, telefone, origem: "whatsapp" });
    const entryColumnId = await getEntryColumnId();
    await createCard({
      lead_id: lead.id,
      coluna_id: entryColumnId,
      prioridade: "media",
      ultima_interacao: timestamp
    });
  }

  if (!lead) throw new Error("Falha ao criar ou localizar lead");

  const supabase = createSupabaseAdminClient();
  const { data: card } = await (supabase
    .from("cards") as any)
    .select("id, coluna_id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  const message = await createMessage({
    lead_id: lead.id,
    conteudo,
    tipo: "entrada",
    timestamp
  });

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
    messageId: message.id
  };
}
