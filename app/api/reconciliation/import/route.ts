import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { importContact } from "@/lib/services/reconciliation-service";

export const dynamic = "force-dynamic";

const importSchema = z.object({
  jid: z.string().min(1),
  phone: z.string().min(8).max(15),
  name: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const { jid, phone, name } = importSchema.parse(payload);
    const result = await importContact(jid, phone, name);
    return NextResponse.json({ data: result });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Dados invalidos" },
        { status: 400 }
      );
    }
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
