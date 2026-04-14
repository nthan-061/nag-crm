import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { moveActivity } from "@/lib/services/activities-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    await moveActivity(payload);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }

    console.error("Move activity failed", error);
    return NextResponse.json({ error: "Falha ao mover atividade" }, { status: 500 });
  }
}
