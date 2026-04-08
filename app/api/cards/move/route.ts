import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { moveKanbanCard } from "@/lib/services/kanban-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await moveKanbanCard(payload);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Card move failed", error);
    return NextResponse.json({ error: "Falha ao mover card" }, { status: 500 });
  }
}
