import {
  createLeadNote,
  deleteLeadNote,
  listNotesByLead
} from "@/lib/repositories/messages-repository";
import { createNoteSchema } from "@/lib/validations/notes";

export async function getLeadNotes(leadId: string) {
  return listNotesByLead(leadId);
}

export async function addLeadNote(payload: unknown) {
  const parsed = createNoteSchema.parse(payload);
  return createLeadNote({
    lead_id: parsed.leadId,
    conteudo: parsed.content
  });
}

export async function removeLeadNote(noteId: string) {
  return deleteLeadNote(noteId);
}
