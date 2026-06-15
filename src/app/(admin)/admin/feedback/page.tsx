import { Star } from "lucide-react";
import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { listFeedback } from "@/lib/db/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface RegContext {
  id: string;
  full_name: string;
  reference_number: string;
  track_code: string;
}

/**
 * The registrant context for every feedback row, keyed by registration_id.
 * `cache()`-wrapped so the summary, per-track breakdown, and detail list share
 * one registrations lookup per request.
 */
const feedbackContext = cache(async (): Promise<Map<string, RegContext>> => {
  const feedback = await listFeedback();
  if (feedback.length === 0) return new Map();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select("id, full_name, reference_number, track_code")
    .in(
      "id",
      feedback.map((f) => f.registration_id),
    );
  return new Map(((data ?? []) as RegContext[]).map((r) => [r.id, r]));
});

export const dynamic = "force-dynamic";

const ATTEND_LABEL: Record<"yes" | "no" | "maybe", string> = {
  yes: "Yes",
  maybe: "Maybe",
  no: "No",
};

export const metadata: Metadata = {
  title: "Feedback · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminFeedbackPage() {
  await requireRole("admin");

  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
        Voice of the room
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Feedback
      </h1>

      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Suspense fallback={<RatingCardsSkeleton />}>
          <RatingCardsRow />
        </Suspense>
      </div>

      <Suspense fallback={null}>
        <TrackRatingsSection />
      </Suspense>

      <div className="mt-8 flex flex-col gap-4">
        <Suspense fallback={<FeedbackListSkeleton />}>
          <FeedbackList />
        </Suspense>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Suspense children - `listFeedback` is `cache()`-wrapped so both share one
//  query. Track names come from the static catalogue (no DB join).
// ─────────────────────────────────────────────────────────────────────────────

async function RatingCardsRow() {
  const feedback = await listFeedback();
  const totals = aggregateRatings(feedback);
  return (
    <>
      <Avg label="Responses" value={feedback.length} suffix="" />
      <Avg label="Overall" value={totals.overall} />
      <Avg label="Track" value={totals.track} />
      <Avg label="Facilitator" value={totals.facilitator} />
    </>
  );
}

async function TrackRatingsSection() {
  const [feedback, ctx] = await Promise.all([
    listFeedback(),
    feedbackContext(),
  ]);
  if (feedback.length === 0) return null;

  // Group every response by its registrant's track, then average each rating.
  const byTrack = new Map<
    string,
    { count: number; overall: number; track: number; facilitator: number }
  >();
  for (const f of feedback) {
    const code = ctx.get(f.registration_id)?.track_code;
    if (!code) continue;
    const row = byTrack.get(code) ?? {
      count: 0,
      overall: 0,
      track: 0,
      facilitator: 0,
    };
    row.count += 1;
    row.overall += f.overall_rating;
    row.track += f.track_rating;
    row.facilitator += f.facilitator_rating;
    byTrack.set(code, row);
  }
  const rows = [...byTrack.entries()]
    .map(([code, r]) => ({
      code,
      name: TRACKS_BY_CODE[code]?.name ?? code,
      count: r.count,
      overall: round(r.overall / r.count),
      track: round(r.track / r.count),
      facilitator: round(r.facilitator / r.count),
    }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  if (rows.length === 0) return null;

  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-semibold text-navy">
        Ratings by track
      </h2>
      <div className="mt-3 overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-card">
        <table className="min-w-full text-sm">
          <thead className="bg-cream-100">
            <tr className="text-left font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Responses</th>
              <th className="px-4 py-3">Overall</th>
              <th className="px-4 py-3">Track</th>
              <th className="px-4 py-3">Facilitator</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.code} className="border-t border-navy/6">
                <td className="px-4 py-3 font-display font-medium text-navy">
                  {r.name}
                </td>
                <td className="px-4 py-3 text-navy/70">{r.count}</td>
                <td className="px-4 py-3 text-navy">{r.overall} / 5</td>
                <td className="px-4 py-3 text-navy">{r.track} / 5</td>
                <td className="px-4 py-3 text-navy">{r.facilitator} / 5</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function FeedbackList() {
  const feedback = await listFeedback();
  if (feedback.length === 0) {
    return (
      <p className="text-sm text-navy/55">
        No feedback yet. Run the feedback cron after Day 3 to invite attendees.
      </p>
    );
  }

  const regsById = await feedbackContext();

  return (
    <>
      {feedback.map((f) => {
        const reg = regsById.get(f.registration_id);
        const trackName = reg ? TRACKS_BY_CODE[reg.track_code]?.name : null;
        return (
          <article
            key={f.id}
            className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-display font-semibold text-navy">
                  {reg?.full_name ?? "Anonymous"}
                </div>
                <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
                  {reg?.reference_number} · {trackName ?? "-"}
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-1.5">
                <RatingPill label="Overall" value={f.overall_rating} />
                <RatingPill label="Track" value={f.track_rating} />
                <RatingPill label="Facilitator" value={f.facilitator_rating} />
              </div>
            </div>
            {f.enjoyed_most && (
              <p className="mt-3 text-sm text-navy/75">
                <strong className="text-navy">Enjoyed:</strong> {f.enjoyed_most}
              </p>
            )}
            {f.improvements && (
              <p className="mt-2 text-sm text-navy/75">
                <strong className="text-navy">To improve:</strong>{" "}
                {f.improvements}
              </p>
            )}
            {f.testimony && (
              <p className="mt-2 italic text-sm text-navy/85 border-l-2 border-gold/40 pl-3">
                “{f.testimony}”
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-navy/6 pt-3">
              {f.attend_next && (
                <span className="inline-flex rounded-full bg-navy/6 px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] text-navy/65">
                  SkillUp 2.0: {ATTEND_LABEL[f.attend_next]}
                </span>
              )}
              {f.testimony && (
                <span
                  className={`inline-flex rounded-full px-2.5 py-0.5 font-sans text-[10px] uppercase tracking-[0.16em] ${
                    f.share_as_testimonial
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {f.share_as_testimonial
                    ? "OK to share publicly"
                    : "Not for public use"}
                </span>
              )}
            </div>
          </article>
        );
      })}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Skeletons + helpers.
// ─────────────────────────────────────────────────────────────────────────────

function RatingCardsSkeleton() {
  return (
    <>
      {(["Responses", "Overall", "Track", "Facilitator"] as const).map(
        (label) => (
          <div
            key={label}
            className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
          >
            <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              {label}
            </div>
            <div className="mt-2 h-9 w-20 rounded-md bg-navy/8 animate-pulse" />
          </div>
        ),
      )}
    </>
  );
}

function FeedbackListSkeleton() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <article
          key={`fb-skel-${
            // biome-ignore lint/suspicious/noArrayIndexKey: static placeholder
            i
          }`}
          className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-2">
              <span className="h-4 w-44 rounded bg-navy/8 animate-pulse" />
              <span className="h-3 w-32 rounded bg-navy/8 animate-pulse" />
            </div>
            <span className="h-4 w-12 rounded bg-navy/8 animate-pulse" />
          </div>
          <div className="mt-4 h-3 w-3/4 rounded bg-navy/8 animate-pulse" />
          <div className="mt-2 h-3 w-2/3 rounded bg-navy/8 animate-pulse" />
        </article>
      ))}
    </>
  );
}

function aggregateRatings(
  feedback: Array<{
    overall_rating: number;
    track_rating: number;
    facilitator_rating: number;
  }>,
) {
  if (feedback.length === 0) {
    return { overall: 0, track: 0, facilitator: 0 };
  }
  const sum = feedback.reduce(
    (acc, f) => ({
      overall: acc.overall + f.overall_rating,
      track: acc.track + f.track_rating,
      facilitator: acc.facilitator + f.facilitator_rating,
    }),
    { overall: 0, track: 0, facilitator: 0 },
  );
  const n = feedback.length;
  return {
    overall: round(sum.overall / n),
    track: round(sum.track / n),
    facilitator: round(sum.facilitator / n),
  };
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function RatingPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-0.5 text-gold-600">
      <Star className="h-3 w-3" fill="currentColor" aria-hidden />
      <span className="font-sans text-[11px]">
        <span className="text-navy/55">{label}</span> {value}/5
      </span>
    </span>
  );
}

function Avg({
  label,
  value,
  suffix = " / 5",
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card">
      <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-navy">
        {value}
        {suffix && <span className="text-base text-navy/45">{suffix}</span>}
      </div>
    </div>
  );
}
