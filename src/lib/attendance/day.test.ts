import { describe, expect, it } from "vitest";
import { attendanceLog, checkinOn } from "./day";

describe("attendanceLog", () => {
  it("returns the log array when present", () => {
    const log = ["2026-06-12T08:00:00Z", "2026-06-13T08:00:00Z"];
    expect(attendanceLog({ attendance_log: log, attended_at: null })).toBe(log);
  });

  it("falls back to a single attended_at for pre-005 rows", () => {
    expect(
      attendanceLog({
        attendance_log: null,
        attended_at: "2026-06-12T08:00:00Z",
      }),
    ).toEqual(["2026-06-12T08:00:00Z"]);
  });

  it("returns [] when neither is set", () => {
    expect(attendanceLog({ attendance_log: null, attended_at: null })).toEqual(
      [],
    );
  });
});

describe("checkinOn", () => {
  const entry = {
    attendance_log: ["2026-06-12T09:00:00+01:00", "2026-06-13T10:30:00+01:00"],
    attended_at: "2026-06-13T10:30:00+01:00",
  };

  it("returns the Day 1 timestamp for Day 1's key", () => {
    expect(checkinOn(entry, "2026-06-12")).toBe("2026-06-12T09:00:00+01:00");
  });

  it("returns the Day 2 timestamp for Day 2's key", () => {
    expect(checkinOn(entry, "2026-06-13")).toBe("2026-06-13T10:30:00+01:00");
  });

  it("returns null for a day with no check-in", () => {
    expect(checkinOn(entry, "2026-06-14")).toBeNull();
  });

  it("matches on the Lagos calendar day across the UTC boundary", () => {
    // 23:30 UTC Jun 12 is 00:30 Jun 13 in Lagos.
    const e = {
      attendance_log: ["2026-06-12T23:30:00Z"],
      attended_at: "2026-06-12T23:30:00Z",
    };
    expect(checkinOn(e, "2026-06-13")).toBe("2026-06-12T23:30:00Z");
    expect(checkinOn(e, "2026-06-12")).toBeNull();
  });
});
