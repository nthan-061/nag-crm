import { NextResponse } from "next/server";
import { getMessages } from "@/lib/services/message-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  try {
    const messages = await getMessages(params.leadId);
    return NextResponse.json({ data: messages }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("List messages failed", error);
    return NextResponse.json({ error: "Falha ao carregar mensagens" }, { status: 500 });
  }
}
