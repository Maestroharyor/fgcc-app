import { describe, expect, it } from "vitest";
import { countdownTo, formatInLagos } from "./date";

describe("countdownTo", () => {
  it("computes days/hours/minutes/seconds for a future target", () => {
    const from = new Date("2026-06-10T09:00:00+01:00");
    const target = new Date("2026-06-12T09:00:00+01:00");
    const parts = countdownTo(target, from);
    expect(parts.days).toBe(2);
    expect(parts.hours).toBe(0);
    expect(parts.minutes).toBe(0);
    expect(parts.seconds).toBe(0);
    expect(parts.hasStarted).toBe(false);
    expect(parts.totalSeconds).toBe(2 * 86400);
  });

  it("handles mixed components", () => {
    const from = new Date("2026-06-11T08:00:00+01:00");
    const target = new Date("2026-06-12T09:30:45+01:00");
    const parts = countdownTo(target, from);
    expect(parts.days).toBe(1);
    expect(parts.hours).toBe(1);
    expect(parts.minutes).toBe(30);
    expect(parts.seconds).toBe(45);
  });

  it("returns all-zero hasStarted=true when target is in the past", () => {
    const from = new Date("2026-06-15T09:00:00+01:00");
    const target = new Date("2026-06-12T09:00:00+01:00");
    const parts = countdownTo(target, from);
    expect(parts.hasStarted).toBe(true);
    expect(parts.days).toBe(0);
    expect(parts.hours).toBe(0);
    expect(parts.minutes).toBe(0);
    expect(parts.seconds).toBe(0);
    expect(parts.totalSeconds).toBe(0);
  });

  it("returns hasStarted=true at the exact target moment", () => {
    const moment = new Date("2026-06-12T09:00:00+01:00");
    const parts = countdownTo(moment, moment);
    expect(parts.hasStarted).toBe(true);
    expect(parts.totalSeconds).toBe(0);
  });
});

describe("formatInLagos", () => {
  it("formats a date using the Africa/Lagos timezone", () => {
    const date = new Date("2026-06-12T08:00:00Z"); // 09:00 in Lagos (UTC+1)
    expect(formatInLagos(date, "yyyy-MM-dd HH:mm")).toBe("2026-06-12 09:00");
  });
});
