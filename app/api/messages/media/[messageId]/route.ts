import { NextResponse } from "next/server";
import { getMessageById } from "@/lib/repositories/messages-repository";
import { createMessageMediaSignedUrl } from "@/lib/services/media-storage-service";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const message = await getMessageById(params.messageId);
    if (!message?.media_storage_path) {
      return NextResponse.json({ error: "Midia indisponivel" }, { status: 404 });
    }

    const url = new URL(request.url);
    const downloadFileName = url.searchParams.get("download")
      ? message.media_file_name ?? `mensagem-${message.id}`
      : null;
    const signedUrl = await createMessageMediaSignedUrl(message.media_storage_path, 60, downloadFileName);
    return NextResponse.redirect(signedUrl, {
      headers: {
        "Cache-Control": "no-store, max-age=0"
      }
    });
  } catch (error) {
    console.error("Message media fetch failed", error);
    return NextResponse.json({ error: "Falha ao carregar midia" }, { status: 500 });
  }
}
