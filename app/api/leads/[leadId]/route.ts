import { NextResponse } from "next/server";
import { removeLead } from "@/lib/services/leads-service";

export const dynamic = "force-dynamic";

export async function DELETE(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const deletedLead = await removeLead(params.leadId);

    if (!deletedLead) {
      return NextResponse.json({ error: "Lead nao encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      { ok: true, leadId: deletedLead.id },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (error) {
    console.error("Lead deletion failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Nao foi possivel apagar o lead" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
