import type { Metadata } from "next";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { requireRole } from "@/lib/auth/require-role";
import type {
  DBTrackCapacity,
  DBWaitlistEntry,
  TrackCategory,
} from "@/lib/db/types";
import { listWaitlistForTrack } from "@/lib/db/waitlist";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracks · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTracksPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const { data: tracksData } = await supabase
    .from("v_track_capacity")
    .select("*")
    .order("name", { ascending: true });
  const tracks = (tracksData ?? []) as DBTrackCapacity[];

  const waitlists = await Promise.all(
    tracks.map((t) => listWaitlistForTrack(t.id)),
  );

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-primary-blue)]">
        Tracks
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-[var(--color-text-navy)]">
        Tracks &amp; waitlists
      </h1>
      <p className="text-sm text-[var(--color-text-navy)]/65">
        Capacity, facilitator status, and waitlist per track. WhatsApp/Telegram
        links are managed in{" "}
        <code className="text-xs">src/content/tracks.ts</code>.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        {tracks.map((t, i) => (
          <TrackPanel key={t.id} track={t} waitlist={waitlists[i]} />
        ))}
      </div>
    </div>
  );
}

function TrackPanel({
  track,
  waitlist,
}: {
  track: DBTrackCapacity;
  waitlist: DBWaitlistEntry[];
}) {
  const pct = Math.min(
    100,
    (track.current_count / Math.max(track.capacity, 1)) * 100,
  );
  return (
    <article className="rounded-2xl border border-[var(--color-text-navy)]/8 bg-white p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryBadge category={track.category as TrackCategory} />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/55">
              {track.code}
            </span>
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold text-[var(--color-text-navy)]">
            {track.name}
          </h2>
          <p className="text-xs text-[var(--color-text-navy)]/55 mt-1">
            Facilitator: {track.facilitator_name ?? "TBA"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-mono text-xs text-[var(--color-text-navy)]/60">
            {track.current_count} / {track.capacity}
          </div>
          {track.is_full ? (
            <span className="mt-1 inline-flex rounded-full bg-[var(--color-accent-coral)]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-accent-coral)]">
              Full
            </span>
          ) : (
            <span className="mt-1 inline-flex rounded-full bg-[var(--color-primary-blue)]/8 px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-primary-blue)]">
              {track.remaining} left
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--color-text-navy)]/8">
        <div
          className="h-full rounded-full bg-[var(--color-primary-blue)]"
          style={{ width: `${pct}%` }}
        />
      </div>

      {waitlist.length > 0 && (
        <div className="mt-5">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-warm-gold-600)]">
            Waitlist ({waitlist.length})
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {waitlist.slice(0, 5).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-neutral-cream)] px-3 py-2 text-sm"
              >
                <span className="font-display font-medium text-[var(--color-text-navy)]">
                  #{w.position} · {w.full_name}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-navy)]/55">
                  {w.notified_at ? "Offered" : "Waiting"}
                </span>
              </li>
            ))}
            {waitlist.length > 5 && (
              <li className="text-xs text-[var(--color-text-navy)]/55">
                + {waitlist.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </article>
  );
}
