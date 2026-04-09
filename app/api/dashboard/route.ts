import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const data = await getDashboardData();
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Get dashboard failed", error);
    return NextResponse.json({ error: "Falha ao carregar dashboard" }, { status: 500 });
  }
}
