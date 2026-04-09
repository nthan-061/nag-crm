import {
  createColumn,
  deleteColumn,
  listColumns,
  reorderColumns,
  updateColumn
} from "@/lib/repositories/columns-repository";
import { createColumnSchema, reorderColumnsSchema, updateColumnSchema } from "@/lib/validations/columns";

export async function getColumns() {
  return listColumns();
}

export async function addColumn(payload: unknown) {
  return createColumn(createColumnSchema.parse(payload));
}

export async function editColumn(columnId: string, payload: unknown) {
  return updateColumn(columnId, updateColumnSchema.parse(payload));
}

export async function removeColumn(columnId: string) {
  return deleteColumn(columnId);
}

export async function reorderColumnsService(payload: unknown) {
  const { orderedIds } = reorderColumnsSchema.parse(payload);
  await reorderColumns(orderedIds);
}
