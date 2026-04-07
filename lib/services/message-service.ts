import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getEnv } from "@/lib/env";
import { touchCard } from "@/lib/repositories/cards-repository";
import { createMessage, listMessagesByLead } from "@/lib/repositories/messages-repository";
import { sendMessageSchema } from "@/lib/validations/messages";

export async function getMessages(leadId: string) {
  return listMessagesByLead(leadId);
}

async function resolveEvolutionInstanceName() {
  const env = getEnv();
  if (!env.evolutionApiUrl || !env.evolutionApiKey || !env.evolutionInstance) {
    return null;
  }

  const response = await fetch(`${env.evolutionApiUrl}/instance/fetchInstances`, {
    headers: {
      apikey: env.evolutionApiKey
    },
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel consultar as instancias da Evolution");
  }

  const instances = (await response.json()) as Array<{
    id?: string;
    name?: string;
    token?: string;
  }>;

  const normalized = env.evolutionInstance;
  const matched =
    instances.find((instance) => instance.name === normalized) ??
    instances.find((instance) => instance.token === normalized) ??
    instances.find((instance) => instance.id === normalized);

  return matched?.name ?? normalized;
}

export async function sendMessage(payload: unknown) {
  const parsed = sendMessageSchema.parse(payload);
  const timestamp = new Date().toISOString();

  const supabase = createSupabaseAdminClient();
  const { data: card } = await (supabase.from("cards") as any).select("id").eq("lead_id", parsed.leadId).maybeSingle();
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
    const instanceName = await resolveEvolutionInstanceName();
    const response = await fetch(`${env.evolutionApiUrl}/message/sendText/${encodeURIComponent(instanceName ?? env.evolutionInstance)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: env.evolutionApiKey
      },
      body: JSON.stringify({
        number: (lead as unknown as { telefone: string }).telefone,
        text: parsed.content
      })
    });

    if (!response.ok) {
      throw new Error("Falha ao enviar mensagem pela Evolution");
    }
  }

  const message = await createMessage({
    lead_id: parsed.leadId,
    conteudo: parsed.content,
    tipo: "saida",
    timestamp
  });

  if ((card as unknown as { id: string } | null)?.id) {
    await touchCard((card as unknown as { id: string }).id, timestamp);
  }

  return message;
}
