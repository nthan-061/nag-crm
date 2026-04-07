import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { processWhatsappWebhook } from "@/lib/services/webhook-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const env = getEnv();
  const secret = request.headers.get("x-webhook-secret");
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("apikey");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const queryToken = request.nextUrl.searchParams.get("token");

  const hasValidSecret =
    !env.webhookSecret ||
    secret === env.webhookSecret ||
    querySecret === env.webhookSecret ||
    queryToken === env.webhookSecret ||
    authHeader === `Bearer ${env.webhookSecret}`;
  const hasValidEvolutionKey = !!env.evolutionApiKey && apiKeyHeader === env.evolutionApiKey;

  if (!hasValidSecret && !hasValidEvolutionKey) {
    console.warn("Webhook unauthorized", {
      hasSecretHeader: !!secret,
      hasApiKeyHeader: !!apiKeyHeader,
      hasQuerySecret: !!querySecret,
      hasQueryToken: !!queryToken
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const data = await processWhatsappWebhook(payload);
    return NextResponse.json({ data });
  } catch (error) {
    console.error("Webhook processing failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook processing failed" },
      { status: 500 }
    );
  }
}
