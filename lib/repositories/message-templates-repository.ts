import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { MessageTemplate } from "@/lib/types/database";

export async function listActiveMessageTemplates(): Promise<MessageTemplate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .select("*")
    .eq("is_active", true)
    .order("title");

  if (error) throw error;
  return data ?? [];
}

export async function createMessageTemplate(input: { title: string; content: string }): Promise<MessageTemplate> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .insert({ title: input.title, content: input.content })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateMessageTemplate(
  templateId: string,
  input: { title?: string; content?: string; is_active?: boolean }
): Promise<MessageTemplate> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("message_templates")
    .update(input)
    .eq("id", templateId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function deactivateMessageTemplate(templateId: string): Promise<void> {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("message_templates")
    .update({ is_active: false })
    .eq("id", templateId);

  if (error) throw error;
}
