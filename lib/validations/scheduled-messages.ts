import { z } from "zod";

export const scheduleMessageSchema = z.object({
  leadId: z.string().uuid(),
  content: z.string().trim().min(1).max(5000),
  scheduledFor: z.string().datetime()
}).superRefine((value, ctx) => {
  const scheduledAt = new Date(value.scheduledFor).getTime();
  if (!Number.isFinite(scheduledAt)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledFor"], message: "Data invalida" });
    return;
  }

  if (scheduledAt < Date.now() - 60_000) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["scheduledFor"], message: "Agendamento no passado" });
  }
});

export const leadScheduledMessagesSchema = z.object({
  leadId: z.string().uuid()
});

export const cancelScheduledMessageSchema = z.object({
  scheduledMessageId: z.string().uuid()
});
