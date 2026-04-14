import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { processPendingMessageMedia } from "@/lib/services/message-media-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: NextRequest) {
  const env = getEnv();
  if (!env.cronSecret) return true;
  return request.headers.get("authorization") === `Bearer ${env.cronSecret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 5);
    const data = await processPendingMessageMedia(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 5);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("[message-media] pending processor failed", error);
    return NextResponse.json({ error: "Falha ao processar midias pendentes" }, { status: 500 });
  }
}
