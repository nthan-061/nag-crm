import { NextResponse } from "next/server";
import { getKanbanCards } from "@/lib/services/kanban-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const cards = await getKanbanCards();
  return NextResponse.json({ data: cards });
}
