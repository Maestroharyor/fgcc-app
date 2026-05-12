import { NextResponse } from "next/server";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";

/**
 * Public capacity feed for the registration form's client-side fetch. Returns
 * the static track catalogue merged with live counts so the form can render
 * "X seats left" badges without blocking the initial paint on a DB roundtrip.
 *
 * Edge-cached for 10s with a 30s stale-while-revalidate window - bursts during
 * registration open hour all share one DB query per cache window. Stale reads
 * are safe because the server action in
 * `src/app/(marketing)/skillup/register/actions.ts` re-checks capacity per
 * registrant and waitlist-falls-back if the chosen track is actually full.
 */
export async function GET() {
  const counts = await getTrackCounts();
  const tracks = withCapacity(counts);
  return NextResponse.json(tracks, {
    headers: {
      "Cache-Control": "public, s-maxage=10, stale-while-revalidate=30",
    },
  });
}
