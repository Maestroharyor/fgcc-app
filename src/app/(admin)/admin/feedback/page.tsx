import { Star } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { TRACKS_BY_CODE } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { listFeedback } from "@/lib/db/feedback";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Suspense fallback={<RatingCardsSkeleton />}>
          <RatingCardsRow />
        </Suspense>
      </div>

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
      <Avg label="Overall" value={totals.overall} />
      <Avg label="Track" value={totals.track} />
      <Avg label="Facilitator" value={totals.facilitator} />
    </>
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

  // Pull associated registrants for context.
  const supabase = await createSupabaseServerClient();
  const regIds = feedback.map((f) => f.registration_id);
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, full_name, reference_number, track_code")
    .in("id", regIds);
  const regsById = new Map(
    (
      (regs ?? []) as Array<{
        id: string;
        full_name: string;
        reference_number: string;
        track_code: string;
      }>
    ).map((r) => [r.id, r]),
  );

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
              <div className="flex items-center gap-1 text-gold-600">
                <Star className="h-3.5 w-3.5" fill="currentColor" />
                <span className="font-sans text-sm">{f.overall_rating}/5</span>
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
      {(["Overall", "Track", "Facilitator"] as const).map((label) => (
        <div
          key={label}
          className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card"
        >
          <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
            {label}
          </div>
          <div className="mt-2 h-9 w-20 rounded-md bg-navy/8 animate-pulse" />
        </div>
      ))}
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

function Avg({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-5 shadow-card">
      <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
        {label}
      </div>
      <div className="mt-2 font-display text-3xl font-semibold text-navy">
        {value}
        <span className="text-base text-navy/45"> / 5</span>
      </div>
    </div>
  );
}
