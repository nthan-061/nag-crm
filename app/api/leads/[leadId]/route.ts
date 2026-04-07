import { NextResponse } from "next/server";
import { removeLead } from "@/lib/services/leads-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  await removeLead(params.leadId);
  return NextResponse.json({ ok: true });
}
