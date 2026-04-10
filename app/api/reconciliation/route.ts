import { NextResponse } from "next/server";
import { findMissingContacts, lookupContact } from "@/lib/services/reconciliation-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get("phone");

    if (phone) {
      const result = await lookupContact(phone);
      return NextResponse.json({ data: result });
    }

    const contacts = await findMissingContacts();
    return NextResponse.json({ data: contacts });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
