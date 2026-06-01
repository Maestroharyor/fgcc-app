import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBBatch } from "./types";

/**
 * Fetch the batch a "registered for others" submission belongs to, so the admin
 * detail page can show who registered the person. Wrapped in `cache()` for
 * request-level dedupe. Returns null on miss or error (helpers swallow errors).
 */
export const getBatchById = cache(
  async (id: string): Promise<DBBatch | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("batches")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as DBBatch;
  },
);
