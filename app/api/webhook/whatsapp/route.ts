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
  const querySecret = request.nextUrl.searchParams.get("secret");
  const queryToken = request.nextUrl.searchParams.get("token");

  if (env.webhookSecret) {
    if (secret === env.webhookSecret) return true;
    if (authHeader === `Bearer ${env.webhookSecret}`) return true;
    if (querySecret === env.webhookSecret) return true;
    if (queryToken === env.webhookSecret) return true;
  }

  if (env.evolutionApiKey && apiKeyHeader === env.evolutionApiKey) return true;

  return false;
}

export async function POST(request: NextRequest) {
  const env = getEnv();
  const querySecret = request.nextUrl.searchParams.get("secret");

  console.log("[webhook] received", {
    hasWebhookSecret: !!env.webhookSecret,
    hasEvolutionApiKey: !!env.evolutionApiKey,
    querySecretMatch: querySecret === env.webhookSecret,
    headers: {
      "x-webhook-secret": !!request.headers.get("x-webhook-secret"),
      authorization: !!request.headers.get("authorization"),
      apikey: !!request.headers.get("apikey"),
    }
  });

  if (!isAuthorized(request, env)) {
    console.warn("[webhook] unauthorized");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    console.warn("[webhook] invalid JSON");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = (payload as Record<string, unknown>)?.event;
  console.log("[webhook] authorized, event:", event);

  try {
    const data = await processWhatsappWebhook(payload);
    console.log("[webhook] processed:", data);
    return NextResponse.json({ data });
  } catch (error) {
    if (error instanceof ZodError) {
      console.warn("[webhook] zod validation failed", error.issues);
      return NextResponse.json({ error: "Invalid payload" }, { status: 422 });
    }
    console.error("[webhook] processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
