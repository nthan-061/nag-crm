import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { createActivity, getActivitiesBoard } from "@/lib/services/activities-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const board = await getActivitiesBoard();
    return NextResponse.json({ data: board }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("List activities failed", error);
    return NextResponse.json({ error: "Falha ao carregar atividades" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const activity = await createActivity(payload);
    return NextResponse.json({ data: activity }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }

    console.error("Create activity failed", error);
    return NextResponse.json({ error: "Falha ao criar atividade" }, { status: 500 });
  }
}
