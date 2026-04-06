import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { processWhatsappWebhook } from "@/lib/services/webhook-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const env = getEnv();
  const secret = request.headers.get("x-webhook-secret");

  if (env.webhookSecret && secret !== env.webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const data = await processWhatsappWebhook(payload);
  return NextResponse.json({ data });
}
