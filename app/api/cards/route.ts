import { NextResponse } from "next/server";
import { getKanbanCards } from "@/lib/services/kanban-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const cards = await getKanbanCards();
    return NextResponse.json({ data: cards }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("List cards failed", error);
    return NextResponse.json({ error: "Falha ao carregar cards" }, { status: 500 });
  }
}
