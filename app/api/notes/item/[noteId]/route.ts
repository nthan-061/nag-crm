import { NextResponse } from "next/server";
import { removeLeadNote } from "@/lib/services/notes-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: { noteId: string } }
) {
  try {
    await removeLeadNote(params.noteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete note failed", error);
    return NextResponse.json({ error: "Falha ao remover anotacao" }, { status: 500 });
  }
}
