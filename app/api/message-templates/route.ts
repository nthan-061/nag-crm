import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { addMessageTemplate, getMessageTemplates } from "@/lib/services/message-templates-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getMessageTemplates();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Get message templates failed", error);
    return NextResponse.json({ error: "Falha ao carregar respostas rapidas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await addMessageTemplate(payload);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Create message template failed", error);
    return NextResponse.json({ error: "Falha ao criar resposta rapida" }, { status: 500 });
  }
}
