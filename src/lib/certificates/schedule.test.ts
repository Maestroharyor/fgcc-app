import { describe, expect, it } from "vitest";
import {
  assignScheduleDays,
  type CertificateCandidate,
  dayKeyAfter,
  eligibleForCertificate,
  planSchedule,
} from "./schedule";

// Lagos timestamps so the derived day key is deterministic regardless of host TZ.
const DAY1 = "2026-06-12";
const DAY2 = "2026-06-13";
const day1At = "2026-06-12T09:30:00+01:00";
const day2At = "2026-06-13T10:00:00+01:00";

function candidate(over: Partial<CertificateCandidate>): CertificateCandidate {
  return {
    id: "c1",
    email: "a@example.com",
    track_code: "UXD",
    attendance_log: [day1At],
    attended_at: day1At,
    certificate_status: "none",
    certificate_sent_at: null,
    ...over,
  };
}

describe("dayKeyAfter", () => {
  it("advances Lagos calendar days", () => {
    expect(dayKeyAfter("2026-06-16", 0)).toBe("2026-06-16");
    expect(dayKeyAfter("2026-06-16", 1)).toBe("2026-06-17");
    expect(dayKeyAfter("2026-06-30", 1)).toBe("2026-07-01");
  });
});

describe("planSchedule", () => {
  it("splits a count into per-day batches", () => {
    expect(planSchedule(120, 50, "2026-06-16")).toEqual([
      { dateKey: "2026-06-16", count: 50 },
      { dateKey: "2026-06-17", count: 50 },
      { dateKey: "2026-06-18", count: 20 },
    ]);
  });

  it("returns a single day when everything fits", () => {
    expect(planSchedule(30, 50, "2026-06-16")).toEqual([
      { dateKey: "2026-06-16", count: 30 },
    ]);
  });

  it("returns nothing for an empty audience", () => {
    expect(planSchedule(0, 50, "2026-06-16")).toEqual([]);
  });
});

describe("assignScheduleDays", () => {
  it("maps ordered ids onto consecutive days", () => {
    expect(assignScheduleDays(["a", "b", "c"], 2, "2026-06-16")).toEqual([
      { dateKey: "2026-06-16", ids: ["a", "b"] },
      { dateKey: "2026-06-17", ids: ["c"] },
    ]);
  });
});

describe("eligibleForCertificate", () => {
  it("keeps attendees of any selected day", () => {
    const rows = [
      candidate({ id: "c1", attendance_log: [day1At] }),
      candidate({ id: "c2", attendance_log: [day2At] }),
    ];
    const out = eligibleForCertificate(rows, { dayKeys: [DAY1] });
    expect(out.map((r) => r.id)).toEqual(["c1"]);
  });

  it("matches an optional track filter", () => {
    const rows = [
      candidate({ id: "c1", track_code: "UXD" }),
      candidate({ id: "c2", track_code: "PHO" }),
    ];
    const out = eligibleForCertificate(rows, {
      dayKeys: [DAY1],
      trackCode: "pho",
    });
    expect(out.map((r) => r.id)).toEqual(["c2"]);
  });

  it("drops placeholder emails and already-sent rows", () => {
    const rows = [
      candidate({ id: "ok" }),
      candidate({ id: "placeholder", email: "x@placeholder.skillup" }),
      candidate({ id: "sent", certificate_status: "sent" }),
      candidate({ id: "stamped", certificate_sent_at: day2At }),
    ];
    const out = eligibleForCertificate(rows, { dayKeys: [DAY1, DAY2] });
    expect(out.map((r) => r.id)).toEqual(["ok"]);
  });

  it("re-includes scheduled and failed rows so the scheduler is re-runnable", () => {
    const rows = [
      candidate({ id: "scheduled", certificate_status: "scheduled" }),
      candidate({ id: "failed", certificate_status: "failed" }),
    ];
    const out = eligibleForCertificate(rows, { dayKeys: [DAY1] });
    expect(out.map((r) => r.id)).toEqual(["scheduled", "failed"]);
  });
});
