import { NextResponse } from "next/server";
import { listCards } from "@/lib/repositories/cards-repository";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const conversations = await listCards();
  return NextResponse.json(
    { data: conversations },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
