import { NextResponse } from "next/server";
import { removeLeadNote } from "@/lib/services/notes-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: { noteId: string } }
) {
  await removeLeadNote(params.noteId);
  return NextResponse.json({ ok: true });
}
