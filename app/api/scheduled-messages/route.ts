import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { scheduleMessage } from "@/lib/services/scheduled-messages-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await scheduleMessage(payload);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Schedule message failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Falha ao programar mensagem" },
      { status: 500 }
    );
  }
}
