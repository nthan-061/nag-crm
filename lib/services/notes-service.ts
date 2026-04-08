import {
  createLeadNote,
  deleteLeadNote,
  listNotesByLead
} from "@/lib/repositories/messages-repository";

export async function getLeadNotes(leadId: string) {
  return listNotesByLead(leadId);
}

export async function addLeadNote(leadId: string, content: string) {
  return createLeadNote({ lead_id: leadId, conteudo: content });
}

export async function removeLeadNote(noteId: string) {
  return deleteLeadNote(noteId);
}
