import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { addColumn, getColumns } from "@/lib/services/columns-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getColumns();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("List columns failed", error);
    return NextResponse.json({ error: "Falha ao carregar colunas" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const data = await addColumn(payload);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Dados invalidos" }, { status: 400 });
    }
    console.error("Create column failed", error);
    return NextResponse.json({ error: "Falha ao criar coluna" }, { status: 500 });
  }
}
