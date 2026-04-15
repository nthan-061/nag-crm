import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ScheduledMessage } from "@/lib/types/database";

export async function createScheduledMessage(input: {
  lead_id: string;
  content: string;
  scheduled_for: string;
}): Promise<ScheduledMessage> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .insert(input)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listScheduledMessagesByLead(leadId: string): Promise<ScheduledMessage[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("scheduled_for", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function cancelScheduledMessage(scheduledMessageId: string): Promise<ScheduledMessage | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .update({ status: "canceled" })
    .eq("id", scheduledMessageId)
    .eq("status", "pending")
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function listDueScheduledMessages(limit = 10): Promise<ScheduledMessage[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}

export async function markScheduledMessageProcessing(scheduledMessageId: string): Promise<ScheduledMessage | null> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .update({ status: "processing" })
    .eq("id", scheduledMessageId)
    .eq("status", "pending")
    .is("sent_at", null)
    .is("message_id", null)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function markScheduledMessageSent(input: {
  scheduledMessageId: string;
  messageId: string;
  externalId?: string | null;
}): Promise<ScheduledMessage> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      message_id: input.messageId,
      external_id: input.externalId ?? null,
      last_error: null
    })
    .eq("id", input.scheduledMessageId)
    .eq("status", "processing")
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markScheduledMessageFailed(input: {
  scheduledMessageId: string;
  attempts: number;
  error: string;
  retry: boolean;
}): Promise<ScheduledMessage> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .update({
      status: input.retry ? "pending" : "failed",
      attempts: input.attempts,
      last_error: input.error.slice(0, 500)
    })
    .eq("id", input.scheduledMessageId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function listScheduledMessagesForDay(day: Date): Promise<ScheduledMessage[]> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("scheduled_messages")
    .select("*")
    .in("status", ["pending", "processing"])
    .gte("scheduled_for", start.toISOString())
    .lte("scheduled_for", end.toISOString())
    .order("scheduled_for", { ascending: true });

  if (error) throw error;
  return data ?? [];
}
