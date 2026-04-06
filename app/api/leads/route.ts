import { NextResponse } from "next/server";
import { listLeads } from "@/lib/repositories/leads-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const leads = await listLeads();
  return NextResponse.json({ data: leads });
}
