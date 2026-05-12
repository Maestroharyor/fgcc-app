import type { Track } from "@/content/tracks";
import { GlyphIcon } from "./GlyphIcon";

export function FacilitatorCard({ track }: { track: Track }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-navy/8 bg-white p-5 shadow-card">
      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-cream text-primary">
        <GlyphIcon name={track.glyph} size={26} />
      </div>
      <div className="min-w-0">
        <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/45">
          {track.code}
        </div>
        <div className="mt-0.5 font-display text-lg font-semibold leading-tight text-navy">
          {track.facilitator ?? "Facilitator TBA"}
        </div>
        <div className="mt-1 truncate text-sm text-navy/65">{track.name}</div>
      </div>
    </div>
  );
}
