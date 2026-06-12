export interface TrackAttendanceRow {
  code: string;
  name: string;
  present: number;
  registered: number;
}

/**
 * Per-track turnout bars: emerald fill at present/registered. Pure and shared
 * by the check-in attendance board and the dashboard "Attendance by track"
 * card so the two surfaces stay visually consistent. Mirrors the capacity-bar
 * markup in the dashboard's "By track" panel.
 */
export function TrackAttendanceBars({
  rows,
  onSelect,
  selectedCode,
}: {
  rows: TrackAttendanceRow[];
  /** When provided, each row becomes a button that filters by its track. */
  onSelect?: (code: string) => void;
  selectedCode?: string;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-navy/55">No registrations yet.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => {
        const pct =
          r.registered > 0
            ? Math.min(100, (r.present / r.registered) * 100)
            : 0;
        const selected = selectedCode === r.code;
        const body = (
          <>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0 font-display font-medium text-navy">
                {r.name}
              </span>
              <span className="shrink-0 whitespace-nowrap font-sans text-xs tabular-nums text-navy/60">
                {r.present} / {r.registered}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-navy/8">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </>
        );
        if (!onSelect) {
          return (
            <div key={r.code} className="flex flex-col gap-1.5">
              {body}
            </div>
          );
        }
        return (
          <button
            key={r.code}
            type="button"
            onClick={() => onSelect(selected ? "" : r.code)}
            className={`flex flex-col gap-1.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-cream-100 ${
              selected ? "bg-cream-100 ring-1 ring-primary/30" : ""
            }`}
          >
            {body}
          </button>
        );
      })}
    </div>
  );
}
