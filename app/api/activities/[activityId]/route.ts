import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  deleteActivity,
  updateActivity
} from "@/lib/services/activities-service";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { activityId: string } }) {
  try {
    const payload = await request.json();
    const activity = await updateActivity(params.activityId, payload);
    return NextResponse.json({ data: activity });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.errors[0]?.message ?? "Dados invalidos" }, { status: 400 });
    }

    console.error("Update activity failed", error);
    return NextResponse.json({ error: "Falha ao atualizar atividade" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { activityId: string } }) {
  try {
    await deleteActivity(params.activityId);
    return NextResponse.json({ data: { id: params.activityId } });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Atividade invalida" }, { status: 400 });
    }

    console.error("Delete activity failed", error);
    return NextResponse.json({ error: "Falha ao excluir atividade" }, { status: 500 });
  }
}
