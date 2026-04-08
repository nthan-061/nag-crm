import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getEnv } from "@/lib/env";
import { processWhatsappWebhook } from "@/lib/services/webhook-service";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest, env: ReturnType<typeof getEnv>): boolean {
  if (!env.webhookSecret && !env.evolutionApiKey) return false;

  const secret = request.headers.get("x-webhook-secret");
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("apikey");

  if (env.webhookSecret) {
    if (secret === env.webhookSecret) return true;
    if (authHeader === `Bearer ${env.webhookSecret}`) return true;
  }

  if (env.evolutionApiKey && apiKeyHeader === env.evolutionApiKey) return true;

  return false;
}

export async function POST(request: NextRequest) {
  const env = getEnv();

  if (!isAuthorized(request, env)) {
    console.warn("Webhook unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const data = await processWhatsappWebhook(payload);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn("Webhook payload validation failed", error.issues);
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
    }
    console.error("Webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
