import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { editColumn, removeColumn } from "@/lib/services/columns-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { columnId: string } }
) {
  try {
    const payload = await request.json();
    const data = await editColumn(params.columnId, payload);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Update column failed", error);
    return NextResponse.json({ error: "Falha ao atualizar coluna" }, { status: 500 });
  }
}

export async function DELETE(
  _: Request,
  { params }: { params: { columnId: string } }
) {
  try {
    await removeColumn(params.columnId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Delete column failed", error);
    return NextResponse.json({ error: "Falha ao remover coluna" }, { status: 500 });
  }
}
