import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { processDueScheduledMessages } from "@/lib/services/scheduled-messages-service";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const env = getEnv();
  if (!env.cronSecret) return process.env.NODE_ENV !== "production";
  return (
    request.headers.get("authorization") === `Bearer ${env.cronSecret}` ||
    request.headers.get("x-cron-secret") === env.cronSecret
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);
    const data = await processDueScheduledMessages(Number.isFinite(limit) ? limit : 10);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Scheduled message processor failed", error);
    return NextResponse.json({ error: "Falha ao processar mensagens programadas" }, { status: 500 });
  }
}
