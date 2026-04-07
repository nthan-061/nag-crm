import { NextRequest, NextResponse } from "next/server";
import { addLeadNote, getLeadNotes } from "@/lib/services/notes-service";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  const data = await getLeadNotes(params.leadId);
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const data = await addLeadNote(payload);
  return NextResponse.json({ data });
}
