import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { editMessageTemplate, removeMessageTemplate } from "@/lib/services/message-templates-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { templateId: string } }
) {
  try {
    const payload = await request.json();
    const data = await editMessageTemplate(params.templateId, payload);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Update message template failed", error);
    return NextResponse.json({ error: "Falha ao atualizar resposta rapida" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    await removeMessageTemplate(params.templateId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Delete message template failed", error);
    return NextResponse.json({ error: "Falha ao remover resposta rapida" }, { status: 500 });
  }
}
