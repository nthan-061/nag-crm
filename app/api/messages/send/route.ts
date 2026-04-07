import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/services/message-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await sendMessage(payload);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Send message failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao enviar mensagem" },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
