import { TRACKS, type Track } from "@/content/tracks";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TrackWithCapacity } from "./types";

/**
 * Fetch live registration counts keyed by track code: `{ UXD: 3, CWD: 0, ... }`.
 *
 * Reads from the `v_track_counts` view (a thin `count(*) group by` over the
 * registrations table). Static track metadata never round-trips — it lives in
 * `src/content/tracks.ts`.
 */
export async function getTrackCounts(): Promise<Record<string, number>> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_track_counts")
    .select("track_code, current_count");
  if (error) {
    console.warn("[db.tracks] getTrackCounts failed:", error.message);
    return {};
  }
  const counts: Record<string, number> = {};
  for (const row of (data ?? []) as Array<{
    track_code: string;
    current_count: number;
  }>) {
    counts[row.track_code] = row.current_count;
  }
  return counts;
}

/**
 * Merge static track metadata with a counts map. Pure function; no I/O.
 * Pass `{}` for empty initial state — every track reads as zero.
 */
export function withCapacity(
  counts: Record<string, number>,
  source: readonly Track[] = TRACKS,
): TrackWithCapacity[] {
  return source.map((t) => {
    const current = counts[t.code] ?? 0;
    return {
      code: t.code,
      name: t.name,
      category: t.category,
      facilitator_name: t.facilitator,
      glyph_key: t.glyph,
      capacity: t.capacity,
      current_count: current,
      remaining: Math.max(0, t.capacity - current),
      is_full: current >= t.capacity,
    };
  });
}

/** Count for a single track. Faster than fetching all when only one is needed. */
export async function getTrackCount(code: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("track_code", code.toUpperCase());
  return count ?? 0;
}
