import { NextResponse } from "next/server";
import { findMissingContacts } from "@/lib/services/reconciliation-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const contacts = await findMissingContacts();
    return NextResponse.json({ data: contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
