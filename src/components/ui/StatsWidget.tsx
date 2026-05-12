import type { TrackWithCapacity } from "@/lib/db/types";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  rows: TrackWithCapacity[];
  totalRegistered: number;
  totalCapacity: number;
}

export function StatsWidget({ rows, totalRegistered, totalCapacity }: Props) {
  return (
    <div className="rounded-3xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Live registrations
          </div>
          <div className="mt-1 font-display text-3xl font-semibold text-navy">
            {totalRegistered}{" "}
            <span className="text-navy/40 text-2xl font-normal">
              / {totalCapacity}
            </span>
          </div>
        </div>
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-navy/55">
          Updated live
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((row) => {
          const pct = Math.min(
            100,
            (row.current_count / Math.max(row.capacity, 1)) * 100,
          );
          return (
            <div
              key={row.code}
              className="flex flex-col gap-1.5 rounded-xl border border-navy/6 bg-cream p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-sm font-medium text-navy">
                  {row.name}
                </span>
                <CategoryBadge category={row.category} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-navy/8">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-navy/55">
                <span>
                  {row.current_count} of {row.capacity} filled
                </span>
                <span>{row.is_full ? "Full" : `${row.remaining} left`}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
