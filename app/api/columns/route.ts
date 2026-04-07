import { NextRequest, NextResponse } from "next/server";
import { addColumn, getColumns } from "@/lib/services/columns-service";

export const dynamic = "force-dynamic";

export async function GET() {
  const data = await getColumns();
  return NextResponse.json({ data });
}

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const data = await addColumn(payload);
  return NextResponse.json({ data });
}
