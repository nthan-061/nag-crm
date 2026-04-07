import { NextResponse } from "next/server";
import { getMessages } from "@/lib/services/message-service";

export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { leadId: string } }
) {
  const messages = await getMessages(params.leadId);
  return NextResponse.json({ data: messages }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
