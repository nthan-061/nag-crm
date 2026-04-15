import { NextResponse } from "next/server";
import { listConversations } from "@/lib/repositories/cards-repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const conversations = await listConversations();
  return NextResponse.json({ data: conversations });
}
