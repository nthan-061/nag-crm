import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { reorderColumnsService } from "@/lib/services/columns-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await reorderColumnsService(payload);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Reorder columns failed", error);
    return NextResponse.json({ error: "Falha ao reordenar colunas" }, { status: 500 });
  }
}
