import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { addLeadNote, getLeadNotes } from "@/lib/services/notes-service";

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

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await addLeadNote(payload);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Create note failed", error);
    return NextResponse.json({ error: "Falha ao criar anotacao" }, { status: 500 });
  }
}
