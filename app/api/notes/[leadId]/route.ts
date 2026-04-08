import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { addLeadNote, getLeadNotes } from "@/lib/services/notes-service";
import { noteContentSchema } from "@/lib/validations/notes";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const data = await getLeadNotes(params.leadId);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("List notes failed", error);
    return NextResponse.json({ error: "Falha ao carregar anotacoes" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { leadId: string } }
) {
  try {
    const body = await request.json();
    const { content } = noteContentSchema.parse(body);
    const data = await addLeadNote(params.leadId, content);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Create note failed", error);
    return NextResponse.json({ error: "Falha ao criar anotacao" }, { status: 500 });
  }
}
