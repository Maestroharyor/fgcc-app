import { ArrowUpRight, Users } from "lucide-react";
import Link from "next/link";
import type { Track } from "@/content/tracks";
import { cn } from "@/lib/utils/cn";
import { CategoryBadge } from "./CategoryBadge";
import { GlyphIcon } from "./GlyphIcon";

interface Props {
  track: Track;
  remaining?: number;
  capacity?: number;
}

const categoryAccent: Record<Track["category"], string> = {
  digital: "before:bg-[var(--color-primary-blue)]",
  creative: "before:bg-[var(--color-accent-coral)]",
  vocational: "before:bg-[var(--color-warm-gold)]",
};

const iconTint: Record<Track["category"], string> = {
  digital: "text-[var(--color-primary-blue)]",
  creative: "text-[var(--color-accent-coral)]",
  vocational: "text-[var(--color-warm-gold-600)]",
};

export function TrackCard({ track, remaining, capacity }: Props) {
  const isFull = remaining !== undefined && remaining <= 0;
  const isFilling = !isFull && remaining !== undefined && remaining <= 5;

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-6 shadow-[var(--shadow-card)] transition",
        "before:absolute before:left-0 before:right-0 before:top-0 before:h-1 before:rounded-t-2xl",
        categoryAccent[track.category],
        "hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] hover:border-[var(--color-warm-gold)]/30",
      )}
    >
      <div className="flex items-center justify-between">
        <div
          className={cn(
            "grid h-12 w-12 place-items-center rounded-xl bg-[var(--color-neutral-cream)]",
            iconTint[track.category],
          )}
        >
          <GlyphIcon name={track.glyph} size={24} />
        </div>
        <CategoryBadge category={track.category} />
      </div>

      <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-[var(--color-text-navy)]">
        {track.name}
      </h3>

      <p className="mt-2 flex-1 text-sm leading-relaxed text-[var(--color-text-navy)]/65">
        {track.description}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3 border-t border-[var(--color-text-navy)]/8 pt-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/45">
            Facilitator
          </div>
          <div className="truncate font-display text-sm font-medium text-[var(--color-text-navy)]">
            {track.facilitator ?? "TBA"}
          </div>
        </div>
        <CapacityPill
          remaining={remaining}
          capacity={capacity ?? track.capacity}
          isFull={isFull}
          isFilling={isFilling}
        />
      </div>

      <Link
        href={`/skillup/register?track=${track.code}`}
        className={cn(
          "mt-5 inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 font-display text-sm font-semibold transition",
          isFull
            ? "bg-[var(--color-text-navy)]/5 text-[var(--color-text-navy)]/55 hover:bg-[var(--color-text-navy)]/10"
            : "bg-[var(--color-primary-blue)] text-white hover:bg-[var(--color-primary-blue-700)]",
        )}
        aria-label={
          isFull
            ? `Join waitlist for ${track.name}`
            : `Register for ${track.name}`
        }
      >
        {isFull ? "Join waitlist" : "Register"}
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </article>
  );
}

function CapacityPill({
  remaining,
  capacity,
  isFull,
  isFilling,
}: {
  remaining?: number;
  capacity: number;
  isFull: boolean;
  isFilling: boolean;
}) {
  if (remaining === undefined) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-neutral-cream-100)] px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-navy)]/55">
        <Users className="h-3 w-3" aria-hidden /> {capacity} seats
      </span>
    );
  }
  if (isFull) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-text-navy)]/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-navy)]/70">
        Full
      </span>
    );
  }
  if (isFilling) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-coral)]/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-accent-coral)]">
        {remaining} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-blue)]/8 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-primary-blue)]">
      {remaining}/{capacity}
    </span>
  );
}
