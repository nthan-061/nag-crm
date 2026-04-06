import { NextRequest, NextResponse } from "next/server";
import { moveKanbanCard } from "@/lib/services/kanban-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  const payload = await request.json();
  const data = await moveKanbanCard(payload);
  return NextResponse.json({ data });
}
