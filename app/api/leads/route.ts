import { NextResponse } from "next/server";
import { listLeads } from "@/lib/repositories/leads-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const leads = await listLeads();
    return NextResponse.json({ data: leads }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("List leads failed", error);
    return NextResponse.json({ error: "Falha ao carregar leads" }, { status: 500 });
  }
}
