import type { Metadata } from "next";
import { Suspense } from "react";
import { CategoryBadge } from "@/components/ui/CategoryBadge";
import { requireRole } from "@/lib/auth/require-role";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import type {
  DBWaitlistEntry,
  TrackCategory,
  TrackWithCapacity,
} from "@/lib/db/types";
import { listWaitlistForTrack } from "@/lib/db/waitlist";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tracks · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminTracksPage() {
  await requireRole("admin");

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Tracks
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Tracks &amp; waitlists
      </h1>
      <p className="text-sm text-navy/65">
        Capacity, facilitator status, and waitlist per track. WhatsApp/Telegram
        links are managed in{" "}
        <code className="text-xs">src/content/tracks.ts</code>.
      </p>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Suspense fallback={<TracksGridSkeleton />}>
          <TracksGridAsync />
        </Suspense>
      </div>
    </div>
  );
}

async function TracksGridAsync() {
  const tracks = withCapacity(await getTrackCounts()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const waitlists = await Promise.all(
    tracks.map((t) => listWaitlistForTrack(t.code)),
  );
  return (
    <>
      {tracks.map((t, i) => (
        <TrackPanel key={t.code} track={t} waitlist={waitlists[i] ?? []} />
      ))}
    </>
  );
}

function TracksGridSkeleton() {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <article
          key={`tracks-grid-skel-${
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
            i
          }`}
          className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex flex-col gap-2">
              <span className="h-3 w-16 rounded bg-navy/8 animate-pulse" />
              <span className="h-5 w-44 rounded bg-navy/8 animate-pulse" />
              <span className="h-3 w-32 rounded bg-navy/8 animate-pulse" />
            </div>
            <span className="h-6 w-14 rounded-full bg-navy/8 animate-pulse" />
          </div>
          <div className="mt-3 h-1.5 rounded-full bg-navy/8 animate-pulse" />
        </article>
      ))}
    </>
  );
}

function TrackPanel({
  track,
  waitlist,
}: {
  track: TrackWithCapacity;
  waitlist: DBWaitlistEntry[];
}) {
  const pct = Math.min(
    100,
    (track.current_count / Math.max(track.capacity, 1)) * 100,
  );
  return (
    <article className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CategoryBadge category={track.category as TrackCategory} />
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              {track.code}
            </span>
          </div>
          <h2 className="mt-2 font-display text-lg font-semibold text-navy">
            {track.name}
          </h2>
          <p className="text-xs text-navy/55 mt-1">
            Facilitator: {track.facilitator_name ?? "TBA"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="font-sans text-xs text-navy/60">
            {track.current_count} / {track.capacity}
          </div>
          {track.is_full ? (
            <span className="mt-1 inline-flex rounded-full bg-coral/8 px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.18em] text-coral">
              Full
            </span>
          ) : (
            <span className="mt-1 inline-flex rounded-full bg-primary/8 px-2 py-0.5 font-sans text-[10px] uppercase tracking-[0.18em] text-primary">
              {track.remaining} left
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy/8">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${pct}%` }}
        />
      </div>

      {waitlist.length > 0 && (
        <div className="mt-5">
          <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-gold-600">
            Waitlist ({waitlist.length})
          </div>
          <ul className="mt-2 flex flex-col gap-1.5">
            {waitlist.slice(0, 5).map((w) => (
              <li
                key={w.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-cream px-3 py-2 text-sm"
              >
                <span className="font-display font-medium text-navy">
                  #{w.position} · {w.full_name}
                </span>
                <span className="font-sans text-[10px] uppercase tracking-[0.16em] text-navy/55">
                  {w.notified_at ? "Offered" : "Waiting"}
                </span>
              </li>
            ))}
            {waitlist.length > 5 && (
              <li className="text-xs text-navy/55">
                + {waitlist.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}
    </article>
  );
}
