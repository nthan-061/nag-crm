import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { cancelScheduledMessage } from "@/lib/services/scheduled-messages-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function DELETE(
  _request: Request,
  { params }: { params: { scheduledMessageId: string } }
) {
  try {
    const data = await cancelScheduledMessage(params.scheduledMessageId);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Agendamento invalido" }, { status: 400 });
    }
    console.error("Cancel scheduled message failed", error);
    return NextResponse.json({ error: "Falha ao cancelar mensagem programada" }, { status: 500 });
  }
}
