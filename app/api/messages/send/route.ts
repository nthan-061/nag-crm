import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/services/message-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const data = await sendMessage(payload);
  return NextResponse.json({ data });
}
