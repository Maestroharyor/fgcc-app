import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBFeedback } from "./types";

/**
 * Wrapped in React `cache()` so the feedback admin page can render the
 * rating-summary Suspense child and the detail-list Suspense child without
 * issuing two identical queries.
 */
export const listFeedback = cache(async (): Promise<DBFeedback[]> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DBFeedback[];
});
