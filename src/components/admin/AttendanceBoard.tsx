"use client";

import { Check, Search, Undo2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { TRACKS, trackByCode } from "@/content/tracks";
import type { AttendanceEntry } from "@/lib/db/registrations";
import { formatDate } from "@/lib/utils/date";
import {
  TrackAttendanceBars,
  type TrackAttendanceRow,
} from "./TrackAttendanceBars";

type View = "present" | "absent";

/**
 * Event-day attendance board. Lists present vs absent registrants with a
 * per-track breakdown, one-tap check-in / undo, and live refresh. Local state
 * only (toggle, track filter, search); `router.refresh()` re-runs the server
 * query after each action and React preserves this state across the soft
 * refresh, so staff don't lose their place.
 */
export function AttendanceBoard({ entries }: { entries: AttendanceEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [view, setView] = useState<View>("present");
  const [track, setTrack] = useState("");
  const [query, setQuery] = useState("");

  const presentCount = entries.filter((e) => e.attended).length;
  const absentCount = entries.length - presentCount;

  // Per-track present + registered, busiest classes first.
  const trackRows: TrackAttendanceRow[] = useMemo(() => {
    const byCode = new Map<string, { present: number; registered: number }>();
    for (const e of entries) {
      const agg = byCode.get(e.track_code) ?? { present: 0, registered: 0 };
      agg.registered += 1;
      if (e.attended) agg.present += 1;
      byCode.set(e.track_code, agg);
    }
    return TRACKS.map((t) => ({
      code: t.code,
      name: t.name,
      present: byCode.get(t.code)?.present ?? 0,
      registered: byCode.get(t.code)?.registered ?? 0,
    }))
      .filter((r) => r.registered > 0)
      .sort(
        (a, b) =>
          b.present - a.present ||
          b.present / b.registered - a.present / a.registered ||
          a.name.localeCompare(b.name),
      );
  }, [entries]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((e) => {
      if (view === "present" ? !e.attended : e.attended) return false;
      if (track && e.track_code !== track) return false;
      if (
        q &&
        !e.full_name.toLowerCase().includes(q) &&
        !e.reference_number.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [entries, view, track, query]);

  const act = (entry: AttendanceEntry, method: "POST" | "DELETE") => {
    setBusyId(entry.id);
    startTransition(async () => {
      await fetch("/api/admin/checkin", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_number: entry.reference_number }),
      }).catch(() => null);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <section className="rounded-3xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          Attendance
        </span>
        <h2 className="font-display text-xl font-semibold text-navy">
          Who's in the room
        </h2>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-[300px_1fr] lg:h-[38rem] gap-6">
        {/* Per-track breakdown — click a track to filter the list. */}
        <div className="flex flex-col rounded-2xl border border-navy/8 bg-cream/40 p-4">
          <div className="mb-3 shrink-0 font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
            By track (present / registered)
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            <TrackAttendanceBars
              rows={trackRows}
              onSelect={setTrack}
              selectedCode={track}
            />
          </div>
        </div>

        {/* List with toggle + filters. */}
        <div className="flex flex-col gap-4 lg:min-h-0">
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="inline-flex rounded-full border border-navy/12 bg-cream/50 p-1">
              <ToggleButton
                active={view === "present"}
                onClick={() => setView("present")}
              >
                Present · {presentCount}
              </ToggleButton>
              <ToggleButton
                active={view === "absent"}
                onClick={() => setView("absent")}
              >
                Absent · {absentCount}
              </ToggleButton>
            </div>
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value)}
              aria-label="Filter by track"
              className="form-input h-10 w-auto py-1"
            >
              <option value="">All tracks</option>
              {TRACKS.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
            <div className="relative flex-1 min-w-[160px]">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or reference"
                aria-label="Search attendance by name or reference"
                className="form-input h-10 w-full pl-9 py-1"
              />
            </div>
          </div>

          <div className="max-h-[24rem] divide-y divide-navy/6 overflow-y-auto rounded-2xl border border-navy/8 lg:max-h-none lg:min-h-0 lg:flex-1">
            {visible.length === 0 && (
              <p className="px-4 py-10 text-center text-sm text-navy/55">
                {view === "present"
                  ? "Nobody checked in here yet."
                  : "Everyone here is checked in. 🎉"}
              </p>
            )}
            {visible.map((e) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <Link
                  href={`/admin/registrations/${e.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-xs font-semibold ${
                      view === "present"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-navy/8 text-navy/55"
                    }`}
                    aria-hidden
                  >
                    {initials(e.full_name)}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-display text-sm font-medium text-navy">
                      {e.full_name}
                    </span>
                    <span className="flex items-center gap-2 font-sans text-[11px] text-navy/55">
                      <span className="text-primary">{e.reference_number}</span>
                      <span className="truncate">
                        {trackByCode(e.track_code)?.name ?? e.track_code}
                      </span>
                      {view === "present" && e.attended_at && (
                        <span className="whitespace-nowrap">
                          · {formatDate(new Date(e.attended_at), "h:mm a")}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
                {view === "absent" ? (
                  <button
                    type="button"
                    onClick={() => act(e, "POST")}
                    disabled={pending && busyId === e.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 font-display text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
                  >
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    {busyId === e.id ? "…" : "Mark present"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => act(e, "DELETE")}
                    disabled={pending && busyId === e.id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-navy/15 bg-white px-3 py-1.5 font-display text-xs font-semibold text-navy/70 hover:bg-cream-100 disabled:opacity-60"
                  >
                    <Undo2 className="h-3.5 w-3.5" aria-hidden />
                    {busyId === e.id ? "…" : "Undo"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** First + last initial, for the row avatar. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : "";
  return (first + last).toUpperCase() || "?";
}

function ToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 font-display text-xs font-semibold transition-colors ${
        active ? "bg-white text-navy shadow-sm" : "text-navy/55 hover:text-navy"
      }`}
    >
      {children}
    </button>
  );
}
