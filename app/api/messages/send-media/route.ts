import { NextRequest, NextResponse } from "next/server";
import { isMediaBatchSendError, sendMediaMessage } from "@/lib/services/message-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data = await sendMediaMessage(formData);
    return NextResponse.json({ data }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch (error) {
    console.error("Send media message failed", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Falha ao enviar midia",
        sent: isMediaBatchSendError(error) ? error.sentCount : undefined,
        failedFileName: isMediaBatchSendError(error) ? error.failedFileName : undefined
      },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
