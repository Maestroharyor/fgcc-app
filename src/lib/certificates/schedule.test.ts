import { describe, expect, it } from "vitest";
import {
  assignScheduleDays,
  type CertificateCandidate,
  eligibleForCertificate,
  planSchedule,
  resolveDeliverEmail,
  sendAtAfter,
} from "./schedule";

// 09:00 Lagos = 08:00 UTC.
const START = "2026-06-16T08:00:00.000Z";

const PLACEHOLDER = "noemail+x@placeholder.skillup";

function candidate(over: Partial<CertificateCandidate>): CertificateCandidate {
  return {
    id: "c1",
    email: "a@example.com",
    track_code: "UXD",
    certificate_status: "none",
    certificate_sent_at: null,
    ...over,
  };
}

describe("sendAtAfter", () => {
  it("advances whole days keeping the same instant", () => {
    expect(sendAtAfter(START, 0)).toBe("2026-06-16T08:00:00.000Z");
    expect(sendAtAfter(START, 1)).toBe("2026-06-17T08:00:00.000Z");
    expect(sendAtAfter("2026-06-30T08:00:00.000Z", 1)).toBe(
      "2026-07-01T08:00:00.000Z",
    );
  });
});

describe("planSchedule", () => {
  it("splits a count into per-day batches at the same time", () => {
    expect(planSchedule(120, 50, START)).toEqual([
      { sendAt: "2026-06-16T08:00:00.000Z", count: 50 },
      { sendAt: "2026-06-17T08:00:00.000Z", count: 50 },
      { sendAt: "2026-06-18T08:00:00.000Z", count: 20 },
    ]);
  });

  it("returns a single day when everything fits", () => {
    expect(planSchedule(30, 50, START)).toEqual([
      { sendAt: "2026-06-16T08:00:00.000Z", count: 30 },
    ]);
  });

  it("returns nothing for an empty audience", () => {
    expect(planSchedule(0, 50, START)).toEqual([]);
  });
});

describe("assignScheduleDays", () => {
  it("maps ordered ids onto consecutive days", () => {
    expect(assignScheduleDays(["a", "b", "c"], 2, START)).toEqual([
      { sendAt: "2026-06-16T08:00:00.000Z", ids: ["a", "b"] },
      { sendAt: "2026-06-17T08:00:00.000Z", ids: ["c"] },
    ]);
  });
});

describe("resolveDeliverEmail", () => {
  it("uses the own email when it's real", () => {
    expect(
      resolveDeliverEmail({ email: "a@x.com", submitter_email: null }),
    ).toBe("a@x.com");
  });

  it("returns null for a placeholder with no registrar", () => {
    expect(
      resolveDeliverEmail({ email: PLACEHOLDER, submitter_email: null }, true),
    ).toBeNull();
  });

  it("routes a placeholder to the registrar only when opted in", () => {
    const c = { email: PLACEHOLDER, submitter_email: "reg@x.com" };
    expect(resolveDeliverEmail(c, false)).toBeNull();
    expect(resolveDeliverEmail(c, true)).toBe("reg@x.com");
  });

  it("ignores a placeholder registrar email", () => {
    expect(
      resolveDeliverEmail(
        { email: PLACEHOLDER, submitter_email: PLACEHOLDER },
        true,
      ),
    ).toBeNull();
  });
});

describe("eligibleForCertificate", () => {
  it("keeps all attendees by default", () => {
    const rows = [candidate({ id: "c1" }), candidate({ id: "c2" })];
    const out = eligibleForCertificate(rows);
    expect(out.map((r) => r.id)).toEqual(["c1", "c2"]);
  });

  it("includes no-email registrants via registrar only when opted in", () => {
    const rows = [
      candidate({ id: "own", email: "own@x.com" }),
      candidate({
        id: "registrar",
        email: PLACEHOLDER,
        submitter_email: "reg@x.com",
      }),
      candidate({ id: "offline", email: PLACEHOLDER, submitter_email: null }),
    ];
    expect(eligibleForCertificate(rows).map((r) => r.id)).toEqual(["own"]);
    expect(
      eligibleForCertificate(rows, { includeRegistrar: true }).map((r) => r.id),
    ).toEqual(["own", "registrar"]);
  });

  it("matches an optional track filter", () => {
    const rows = [
      candidate({ id: "c1", track_code: "UXD" }),
      candidate({ id: "c2", track_code: "PHO" }),
    ];
    const out = eligibleForCertificate(rows, { trackCode: "pho" });
    expect(out.map((r) => r.id)).toEqual(["c2"]);
  });

  it("drops placeholder emails and already-sent rows", () => {
    const rows = [
      candidate({ id: "ok" }),
      candidate({ id: "placeholder", email: "x@placeholder.skillup" }),
      candidate({ id: "sent", certificate_status: "sent" }),
      candidate({ id: "stamped", certificate_sent_at: "2026-06-13T10:00:00Z" }),
    ];
    const out = eligibleForCertificate(rows);
    expect(out.map((r) => r.id)).toEqual(["ok"]);
  });

  it("re-includes scheduled and failed rows so the scheduler is re-runnable", () => {
    const rows = [
      candidate({ id: "scheduled", certificate_status: "scheduled" }),
      candidate({ id: "failed", certificate_status: "failed" }),
    ];
    const out = eligibleForCertificate(rows);
    expect(out.map((r) => r.id)).toEqual(["scheduled", "failed"]);
  });
});
