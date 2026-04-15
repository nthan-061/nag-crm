import { NextResponse } from "next/server";
import { listRecentCrmEvents } from "@/lib/repositories/events-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await listRecentCrmEvents(30);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Get CRM events failed", error);
    return NextResponse.json({ error: "Falha ao carregar eventos" }, { status: 500 });
  }
}
