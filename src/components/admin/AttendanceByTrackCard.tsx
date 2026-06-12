"use client";

import { useMemo, useState } from "react";
import { TRACKS } from "@/content/tracks";
import { checkinOn } from "@/lib/attendance/day";
import type { AttendanceEntry } from "@/lib/db/registrations";
import type { EventDay } from "@/lib/utils/date";
import {
  TrackAttendanceBars,
  type TrackAttendanceRow,
} from "./TrackAttendanceBars";

/**
 * Dashboard "Attendance by track" card with a Day 1 / Day 2 selector. Turnout
 * is scoped to the selected event day from each registrant's `attendance_log`,
 * so the bars read present-on-that-day rather than cumulative attendance.
 * Display-only — no check-in actions live here.
 */
export function AttendanceByTrackCard({
  entries,
  days,
  today,
}: {
  entries: AttendanceEntry[];
  days: EventDay[];
  today: string;
}) {
  // Default to today if it's an event day, else the latest day.
  const [day, setDay] = useState(
    () => days.find((d) => d.key === today)?.key ?? days.at(-1)?.key ?? today,
  );

  const rows: TrackAttendanceRow[] = useMemo(() => {
    const byCode = new Map<string, { present: number; registered: number }>();
    for (const e of entries) {
      const agg = byCode.get(e.track_code) ?? { present: 0, registered: 0 };
      agg.registered += 1;
      if (checkinOn(e, day)) agg.present += 1;
      byCode.set(e.track_code, agg);
    }
    return TRACKS.map((t) => ({
      code: t.code,
      name: t.name,
      present: byCode.get(t.code)?.present ?? 0,
      registered: byCode.get(t.code)?.registered ?? 0,
    }))
      .filter((r) => r.registered > 0)
      .sort((a, b) => b.present - a.present);
  }, [entries, day]);

  return (
    <div className="flex flex-col gap-4">
      {days.length > 1 && (
        <div className="inline-flex w-fit rounded-full border border-navy/12 bg-cream/50 p-1">
          {days.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDay(d.key)}
              className={`rounded-full px-3.5 py-1.5 font-display text-xs font-semibold transition-colors ${
                day === d.key
                  ? "bg-white text-navy shadow-sm"
                  : "text-navy/55 hover:text-navy"
              }`}
            >
              {d.label}
              {d.key === today && (
                <span className="ml-1 text-[10px] text-primary">· today</span>
              )}
            </button>
          ))}
        </div>
      )}
      <TrackAttendanceBars rows={rows} />
    </div>
  );
}
