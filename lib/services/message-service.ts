import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { touchCard } from "@/lib/repositories/cards-repository";
import { createMessage, listMessagesByLead } from "@/lib/repositories/messages-repository";
import { sendMessageSchema } from "@/lib/validations/messages";

export async function getMessages(leadId: string) {
  return listMessagesByLead(leadId);
}

export async function sendMessage(payload: unknown) {
  const parsed = sendMessageSchema.parse(payload);
  const timestamp = new Date().toISOString();

  const message = await createMessage({
    lead_id: parsed.leadId,
    conteudo: parsed.content,
    tipo: "saida",
    timestamp
  });

  const supabase = createSupabaseAdminClient();
  const { data: card } = await (supabase.from("cards") as any).select("id").eq("lead_id", parsed.leadId).maybeSingle();

  if ((card as unknown as { id: string } | null)?.id) {
    await touchCard((card as unknown as { id: string }).id, timestamp);
  }

  const env = getEnv();
  const { data: lead } = await (supabase.from("leads") as any)
    .select("telefone")
    .eq("id", parsed.leadId)
    .maybeSingle();

  if (
    (lead as unknown as { telefone: string } | null)?.telefone &&
    env.evolutionApiUrl &&
    env.evolutionApiKey &&
    env.evolutionInstance
  ) {
    await fetch(`${env.evolutionApiUrl}/message/sendText/${env.evolutionInstance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolutionApiKey
      },
      body: JSON.stringify({
        number: (lead as unknown as { telefone: string }).telefone,
        text: parsed.content
      })
    }).catch(() => null);
  }

  return message;
}
