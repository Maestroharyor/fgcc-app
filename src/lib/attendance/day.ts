import { attendanceDayKey } from "@/lib/utils/date";

/** Minimal registrant shape needed to resolve per-day attendance. */
export interface AttendanceLike {
  attendance_log: string[] | null;
  attended_at: string | null;
}

/**
 * The Lagos days a registrant checked in. Pre-005 rows have no `attendance_log`,
 * so their single `attended_at` stands in for it — mirrors the check-in API.
 */
export function attendanceLog(entry: AttendanceLike): string[] {
  if (Array.isArray(entry.attendance_log)) return entry.attendance_log;
  return entry.attended_at ? [entry.attended_at] : [];
}

/** The ISO timestamp this registrant checked in on `dayKey`, or null. */
export function checkinOn(
  entry: AttendanceLike,
  dayKey: string,
): string | null {
  return (
    attendanceLog(entry).find(
      (d) => attendanceDayKey(new Date(d)) === dayKey,
    ) ?? null
  );
}
