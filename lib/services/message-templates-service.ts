import {
  createMessageTemplate,
  deactivateMessageTemplate,
  listActiveMessageTemplates,
  updateMessageTemplate
} from "@/lib/repositories/message-templates-repository";
import { recordCrmEvent } from "@/lib/repositories/events-repository";
import {
  createMessageTemplateSchema,
  updateMessageTemplateSchema
} from "@/lib/validations/message-templates";

export async function getMessageTemplates() {
  return listActiveMessageTemplates();
}

export async function addMessageTemplate(payload: unknown) {
  const parsed = createMessageTemplateSchema.parse(payload);
  const template = await createMessageTemplate(parsed);
  await recordCrmEvent({
    eventType: "message_template.created",
    source: "settings",
    payload: { templateId: template.id, title: template.title }
  });
  return template;
}

export async function editMessageTemplate(templateId: string, payload: unknown) {
  const parsed = updateMessageTemplateSchema.parse(payload);
  const template = await updateMessageTemplate(templateId, parsed);
  await recordCrmEvent({
    eventType: "message_template.updated",
    source: "settings",
    payload: { templateId, title: template.title }
  });
  return template;
}

export async function removeMessageTemplate(templateId: string) {
  await deactivateMessageTemplate(templateId);
  await recordCrmEvent({
    eventType: "message_template.deleted",
    source: "settings",
    payload: { templateId }
  });
}
