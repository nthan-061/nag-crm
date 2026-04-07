import { NextRequest, NextResponse } from "next/server";
import { editColumn, removeColumn } from "@/lib/services/columns-service";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { columnId: string } }
) {
  const payload = await request.json();
  const data = await editColumn(params.columnId, payload);
  return NextResponse.json({ data });
}

export async function DELETE(
  _: Request,
  { params }: { params: { columnId: string } }
) {
  await removeColumn(params.columnId);
  return NextResponse.json({ ok: true });
}
