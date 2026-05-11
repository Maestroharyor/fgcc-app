import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBFeedback } from "./types";

export async function listFeedback(): Promise<DBFeedback[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DBFeedback[];
}
