import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { touchCard } from "@/lib/repositories/cards-repository";
import { createMessage } from "@/lib/repositories/messages-repository";
import { recordCrmEvent } from "@/lib/repositories/events-repository";
import {
  cancelScheduledMessage as cancelScheduledMessageRecord,
  createScheduledMessage,
  listDueScheduledMessages,
  listScheduledMessagesByLead,
  markScheduledMessageFailed,
  markScheduledMessageProcessing,
  markScheduledMessageSent
} from "@/lib/repositories/scheduled-messages-repository";
import { sendEvolutionTextMessage } from "@/lib/services/evolution-client";
import {
  cancelScheduledMessageSchema,
  leadScheduledMessagesSchema,
  scheduleMessageSchema
} from "@/lib/validations/scheduled-messages";

const MAX_ATTEMPTS = 3;

async function getLeadAndCard(leadId: string) {
  const supabase = createSupabaseAdminClient();
  const [{ data: lead, error: leadError }, { data: card, error: cardError }] = await Promise.all([
    supabase.from("leads").select("id, telefone").eq("id", leadId).is("deleted_at", null).maybeSingle(),
    supabase.from("cards").select("id").eq("lead_id", leadId).maybeSingle()
  ]);

  if (leadError) throw leadError;
  if (cardError) throw cardError;
  if (!lead?.telefone) throw new Error("Lead sem telefone para envio");

  return { lead, cardId: card?.id ?? null };
}

export async function scheduleMessage(payload: unknown) {
  const parsed = scheduleMessageSchema.parse(payload);
  await getLeadAndCard(parsed.leadId);

  const scheduled = await createScheduledMessage({
    lead_id: parsed.leadId,
    content: parsed.content,
    scheduled_for: parsed.scheduledFor
  });

  await recordCrmEvent({
    leadId: parsed.leadId,
    eventType: "scheduled_message.created",
    source: "chat",
    payload: { scheduledMessageId: scheduled.id, scheduledFor: scheduled.scheduled_for }
  });

  return scheduled;
}

export async function getScheduledMessages(leadId: string) {
  const parsed = leadScheduledMessagesSchema.parse({ leadId });
  return listScheduledMessagesByLead(parsed.leadId);
}

export async function cancelScheduledMessage(scheduledMessageId: string) {
  const parsed = cancelScheduledMessageSchema.parse({ scheduledMessageId });
  const canceled = await cancelScheduledMessageRecord(parsed.scheduledMessageId);
  if (canceled) {
    await recordCrmEvent({
      leadId: canceled.lead_id,
      eventType: "scheduled_message.canceled",
      source: "chat",
      payload: { scheduledMessageId: canceled.id }
    });
  }
  return canceled;
}

export async function processDueScheduledMessages(limit = 10) {
  const due = await listDueScheduledMessages(Math.min(Math.max(limit, 1), 20));
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const candidate of due) {
    const locked = await markScheduledMessageProcessing(candidate.id);
    if (!locked) {
      skipped++;
      continue;
    }

    try {
      const { lead, cardId } = await getLeadAndCard(locked.lead_id);
      const timestamp = new Date().toISOString();
      const evolution = await sendEvolutionTextMessage({
        number: lead.telefone,
        text: locked.content
      });

      const message = await createMessage({
        lead_id: locked.lead_id,
        conteudo: locked.content,
        tipo: "saida",
        timestamp,
        external_id: evolution.externalId,
        media_type: "text",
        media_metadata: {
          scheduledMessageId: locked.id
        }
      });

      if (!message) throw new Error("Mensagem ja existia ou nao foi criada");
      if (cardId) await touchCard(cardId, timestamp);

      await markScheduledMessageSent({
        scheduledMessageId: locked.id,
        messageId: message.id,
        externalId: evolution.externalId
      });

      await recordCrmEvent({
        leadId: locked.lead_id,
        eventType: "scheduled_message.sent",
        source: "cron",
        payload: { scheduledMessageId: locked.id, messageId: message.id }
      });
      sent++;
    } catch (error) {
      failed++;
      const attempts = locked.attempts + 1;
      const retry = attempts < MAX_ATTEMPTS;
      const message = error instanceof Error ? error.message : String(error);
      await markScheduledMessageFailed({
        scheduledMessageId: locked.id,
        attempts,
        error: message,
        retry
      });
      await recordCrmEvent({
        leadId: locked.lead_id,
        eventType: retry ? "scheduled_message.retry" : "scheduled_message.failed",
        source: "cron",
        payload: { scheduledMessageId: locked.id, attempts, error: message }
      });
    }
  }

  return { ok: true, checked: due.length, sent, failed, skipped };
}
