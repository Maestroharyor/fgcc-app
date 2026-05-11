import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBTrack, DBTrackCapacity } from "./types";

export async function listTracks(): Promise<DBTrack[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[db.tracks] listTracks failed:", error.message);
    return [];
  }
  return (data ?? []) as DBTrack[];
}

export async function listTrackCapacity(): Promise<DBTrackCapacity[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_track_capacity")
    .select("*")
    .order("name", { ascending: true });
  if (error) {
    console.warn("[db.tracks] listTrackCapacity failed:", error.message);
    return [];
  }
  return (data ?? []) as DBTrackCapacity[];
}

export async function getTrackByCode(code: string): Promise<DBTrack | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("tracks")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBTrack;
}

export async function getTrackCapacityByCode(
  code: string,
): Promise<DBTrackCapacity | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("v_track_capacity")
    .select("*")
    .eq("code", code.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBTrackCapacity;
}
