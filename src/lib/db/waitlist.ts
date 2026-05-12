import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBWaitlistEntry } from "./types";

export async function listWaitlistForTrack(
  trackCode: string,
): Promise<DBWaitlistEntry[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("waitlist")
    .select("*")
    .eq("track_code", trackCode.toUpperCase())
    .order("position", { ascending: true });
  if (error) return [];
  return (data ?? []) as DBWaitlistEntry[];
}

export async function nextWaitlistPosition(trackCode: string): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("waitlist")
    .select("position")
    .eq("track_code", trackCode.toUpperCase())
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.position ?? 0) + 1;
}
