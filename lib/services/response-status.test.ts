import { describe, expect, it } from "vitest";
import { getLeadResponseStatus, getOperationalMetrics } from "@/lib/services/response-status";
import type { Message } from "@/lib/types/database";

function message(overrides: Partial<Message>): Message {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    lead_id: overrides.lead_id ?? "00000000-0000-4000-8000-000000000001",
    conteudo: overrides.conteudo ?? "Oi",
    tipo: overrides.tipo ?? "entrada",
    timestamp: overrides.timestamp ?? "2026-04-15T10:00:00.000Z",
    external_id: overrides.external_id ?? null,
    media_type: overrides.media_type ?? "text",
    media_mime_type: overrides.media_mime_type ?? null,
    media_file_name: overrides.media_file_name ?? null,
    media_url: overrides.media_url ?? null,
    media_storage_path: overrides.media_storage_path ?? null,
    media_size: overrides.media_size ?? null,
    media_duration_seconds: overrides.media_duration_seconds ?? null,
    media_thumbnail: overrides.media_thumbnail ?? null,
    media_metadata: overrides.media_metadata ?? {}
  };
}

describe("response-status", () => {
  it("marks lead as needing response when latest message is inbound", () => {
    const status = getLeadResponseStatus(
      [
        message({ tipo: "saida", timestamp: "2026-04-14T08:00:00.000Z" }),
        message({ tipo: "entrada", timestamp: "2026-04-14T10:00:00.000Z" })
      ],
      new Date("2026-04-15T11:00:00.000Z")
    );

    expect(status.needsResponse).toBe(true);
    expect(status.waitHours).toBe(25);
    expect(status.slaBucket).toBe("24h");
  });

  it("does not mark lead when the latest message was sent by the CRM", () => {
    const status = getLeadResponseStatus(
      [
        message({ tipo: "entrada", timestamp: "2026-04-14T10:00:00.000Z" }),
        message({ tipo: "saida", timestamp: "2026-04-14T11:00:00.000Z" })
      ],
      new Date("2026-04-15T11:00:00.000Z")
    );

    expect(status.needsResponse).toBe(false);
    expect(status.slaBucket).toBe("none");
  });

  it("aggregates operational SLA metrics", () => {
    const metrics = getOperationalMetrics([
      { needsResponse: true, lastMessageType: "entrada", lastMessageAt: "2026-04-12T10:00:00.000Z", waitHours: 73, slaBucket: "72h" },
      { needsResponse: true, lastMessageType: "entrada", lastMessageAt: "2026-04-13T10:00:00.000Z", waitHours: 49, slaBucket: "48h" },
      { needsResponse: false, lastMessageType: "saida", lastMessageAt: "2026-04-15T10:00:00.000Z", waitHours: 1, slaBucket: "none" }
    ]);

    expect(metrics).toEqual({ needsResponse: 2, stale24h: 2, stale48h: 2, stale72h: 1 });
  });
});
