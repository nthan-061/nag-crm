import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getScheduledMessages } from "@/lib/services/scheduled-messages-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _request: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const data = await getScheduledMessages(params.leadId);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Lead invalido" }, { status: 400 });
    }
    console.error("Get scheduled messages failed", error);
    return NextResponse.json({ error: "Falha ao carregar mensagens programadas" }, { status: 500 });
  }
}
