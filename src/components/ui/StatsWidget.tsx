import type { DBTrackCapacity } from "@/lib/db/types";
import { CategoryBadge } from "./CategoryBadge";

interface Props {
  rows: DBTrackCapacity[];
  totalRegistered: number;
  totalCapacity: number;
}

export function StatsWidget({ rows, totalRegistered, totalCapacity }: Props) {
  return (
    <div className="rounded-3xl border border-[var(--color-text-navy)]/8 bg-white p-6 sm:p-8 shadow-[var(--shadow-card)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
            Live registrations
          </div>
          <div className="mt-1 font-display text-3xl font-semibold text-[var(--color-text-navy)]">
            {totalRegistered}{" "}
            <span className="text-[var(--color-text-navy)]/40 text-2xl font-normal">
              / {totalCapacity}
            </span>
          </div>
        </div>
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--color-text-navy)]/55">
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
              key={row.id}
              className="flex flex-col gap-1.5 rounded-xl border border-[var(--color-text-navy)]/6 bg-[var(--color-neutral-cream)] p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display text-sm font-medium text-[var(--color-text-navy)]">
                  {row.name}
                </span>
                <CategoryBadge category={row.category} />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-text-navy)]/8">
                <div
                  className="h-full rounded-full bg-[var(--color-primary-blue)]"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-navy)]/55">
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
