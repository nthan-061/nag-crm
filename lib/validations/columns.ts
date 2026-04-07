import { z } from "zod";

export const createColumnSchema = z.object({
  nome: z.string().min(1).max(120),
  cor: z.string().min(4).max(20).optional().nullable()
});

export const updateColumnSchema = z.object({
  nome: z.string().min(1).max(120).optional(),
  cor: z.string().min(4).max(20).optional().nullable(),
  ordem: z.number().int().positive().optional()
});
