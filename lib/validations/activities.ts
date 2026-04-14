import { z } from "zod";

export const activityStatusSchema = z.enum(["todo", "doing", "done"]);
export const activityPrioritySchema = z.enum(["low", "medium", "high"]);

const optionalTextSchema = z
  .string()
  .trim()
  .max(2000, "A descricao deve ter no maximo 2000 caracteres.")
  .transform((value) => (value.length > 0 ? value : null))
  .nullable()
  .optional();

const optionalDateSchema = z
  .string()
  .trim()
  .datetime("Data invalida.")
  .nullable()
  .optional();

const optionalLeadSchema = z.string().uuid("Lead invalido.").nullable().optional();

export const createActivitySchema = z.object({
  title: z.string().trim().min(2, "Informe um titulo com pelo menos 2 caracteres.").max(140, "O titulo deve ter no maximo 140 caracteres."),
  description: optionalTextSchema,
  status: activityStatusSchema.default("todo"),
  priority: activityPrioritySchema.default("medium"),
  due_date: optionalDateSchema,
  lead_id: optionalLeadSchema
});

export const updateActivitySchema = createActivitySchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: "Informe ao menos um campo para atualizar."
});

export const moveActivitySchema = z.object({
  activityId: z.string().uuid(),
  status: activityStatusSchema,
  position: z.number().int().nonnegative(),
  sourceStatus: activityStatusSchema.nullable().optional(),
  sourceOrderedIds: z.array(z.string().uuid()).optional(),
  targetOrderedIds: z.array(z.string().uuid()).optional()
});

export const deleteActivitySchema = z.object({
  activityId: z.string().uuid()
});

export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type UpdateActivityInput = z.infer<typeof updateActivitySchema>;
export type MoveActivityInput = z.infer<typeof moveActivitySchema>;
