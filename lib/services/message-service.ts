import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { touchCard } from "@/lib/repositories/cards-repository";
import { createMessage, listMessagesByLead } from "@/lib/repositories/messages-repository";
import { resolveInstanceName } from "@/lib/services/evolution-client";
import { sendMessageSchema } from "@/lib/validations/messages";

export async function getMessages(leadId: string) {
  return listMessagesByLead(leadId);
}

export async function sendMessage(payload: unknown) {
  const parsed = sendMessageSchema.parse(payload);
  const timestamp = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { data: card } = await supabase.from("cards").select("id").eq("lead_id", parsed.leadId).maybeSingle();
  const env = getEnv();
  const { data: lead } = await supabase.from("leads").select("telefone").eq("id", parsed.leadId).maybeSingle();

  if (lead?.telefone && env.evolutionApiUrl && env.evolutionApiKey && env.evolutionInstance) {
    const instanceName = await resolveInstanceName();
    const response = await fetch(
      `${env.evolutionApiUrl}/message/sendText/${encodeURIComponent(instanceName ?? env.evolutionInstance)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.evolutionApiKey
        },
        body: JSON.stringify({
          number: lead.telefone,
          text: parsed.content
        })
      }
    );

    if (!response.ok) {
      throw new Error("Falha ao enviar mensagem pela Evolution");
    }

    const evolutionResponse = (await response.json().catch(() => null)) as {
      key?: { id?: string };
    } | null;
    const externalId = evolutionResponse?.key?.id ?? undefined;

    const message = await createMessage({
      lead_id: parsed.leadId,
      conteudo: parsed.content,
      tipo: "saida",
      timestamp,
      external_id: externalId
    });

    if (card?.id) {
      await touchCard(card.id, timestamp);
    }

    return message;
  }

  const message = await createMessage({
    lead_id: parsed.leadId,
    conteudo: parsed.content,
    tipo: "saida",
    timestamp
  });

  if (card?.id) {
    await touchCard(card.id, timestamp);
  }

  return message;
}
