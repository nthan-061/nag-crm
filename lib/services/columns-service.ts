import {
  createColumn,
  deleteColumn,
  listColumns,
  updateColumn
} from "@/lib/repositories/columns-repository";
import { createColumnSchema, updateColumnSchema } from "@/lib/validations/columns";

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
