import { describe, expect, it } from "vitest";
import {
  countdownTo,
  formatDate,
  isRegistrationOpen,
  registrationPhase,
} from "./date";

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

describe("registrationPhase", () => {
  // Default env boundaries: close 2026-06-12T00:00+01:00,
  // start 2026-06-12T09:00+01:00, end 2026-06-15T00:00+01:00.
  it("is open before the close instant", () => {
    expect(registrationPhase(new Date("2026-06-11T23:59:59+01:00"))).toBe(
      "open",
    );
  });

  it("flips to pre-start at the close instant", () => {
    expect(registrationPhase(new Date("2026-06-12T00:00:00+01:00"))).toBe(
      "pre-start",
    );
  });

  it("stays pre-start just before the event start", () => {
    expect(registrationPhase(new Date("2026-06-12T08:59:59+01:00"))).toBe(
      "pre-start",
    );
  });

  it("flips to ongoing at the event start", () => {
    expect(registrationPhase(new Date("2026-06-12T09:00:00+01:00"))).toBe(
      "ongoing",
    );
  });

  it("stays ongoing through June 14", () => {
    expect(registrationPhase(new Date("2026-06-14T23:59:59+01:00"))).toBe(
      "ongoing",
    );
  });

  it("flips to over at the end instant", () => {
    expect(registrationPhase(new Date("2026-06-15T00:00:00+01:00"))).toBe(
      "over",
    );
  });

  it("isRegistrationOpen mirrors the open phase only", () => {
    expect(isRegistrationOpen(new Date("2026-06-11T23:59:59+01:00"))).toBe(
      true,
    );
    expect(isRegistrationOpen(new Date("2026-06-12T00:00:00+01:00"))).toBe(
      false,
    );
  });
});

describe("formatDate", () => {
  it("formats a date using the Africa/Lagos timezone", () => {
    const date = new Date("2026-06-12T08:00:00Z"); // 09:00 in Lagos (UTC+1)
    expect(formatDate(date, "yyyy-MM-dd HH:mm")).toBe("2026-06-12 09:00");
  });
});
