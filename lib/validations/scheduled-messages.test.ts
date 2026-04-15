import { describe, expect, it, vi } from "vitest";
import { scheduleMessageSchema } from "@/lib/validations/scheduled-messages";

describe("scheduleMessageSchema", () => {
  it("accepts a future scheduled message", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00.000Z"));

    const parsed = scheduleMessageSchema.parse({
      leadId: "00000000-0000-4000-8000-000000000001",
      content: "Retomar orçamento amanhã",
      scheduledFor: "2026-04-15T10:10:00.000Z"
    });

    expect(parsed.content).toBe("Retomar orçamento amanhã");
    vi.useRealTimers();
  });

  it("rejects empty content", () => {
    expect(() =>
      scheduleMessageSchema.parse({
        leadId: "00000000-0000-4000-8000-000000000001",
        content: " ",
        scheduledFor: "2026-04-15T10:10:00.000Z"
      })
    ).toThrow();
  });

  it("rejects schedules clearly in the past", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-15T10:00:00.000Z"));

    expect(() =>
      scheduleMessageSchema.parse({
        leadId: "00000000-0000-4000-8000-000000000001",
        content: "Follow-up",
        scheduledFor: "2026-04-15T09:50:00.000Z"
      })
    ).toThrow("Agendamento no passado");

    vi.useRealTimers();
  });
});
