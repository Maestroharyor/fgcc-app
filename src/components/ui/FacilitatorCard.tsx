import type { Track } from "@/content/tracks";
import { GlyphIcon } from "./GlyphIcon";

export function FacilitatorCard({ track }: { track: Track }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-[var(--color-neutral-cream)] text-[var(--color-primary-blue)]">
        <GlyphIcon name={track.glyph} size={26} />
      </div>
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/45">
          {track.code}
        </div>
        <div className="mt-0.5 font-display text-lg font-semibold leading-tight text-[var(--color-text-navy)]">
          {track.facilitator ?? "Facilitator TBA"}
        </div>
        <div className="mt-1 truncate text-sm text-[var(--color-text-navy)]/65">
          {track.name}
        </div>
      </div>
    </div>
  );
}
