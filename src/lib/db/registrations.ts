import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { DBRegistration } from "./types";

export async function getRegistrationByReference(
  ref: string,
): Promise<DBRegistration | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("reference_number", ref.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBRegistration;
}

export async function getRegistrationByEmail(
  email: string,
): Promise<DBRegistration | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBRegistration;
}

/**
 * Wrapped in React `cache()` so the registrant detail page can have a
 * Suspense child for the profile and another for the QR card without
 * issuing two identical queries.
 */
export const getRegistrationById = cache(
  async (id: string): Promise<DBRegistration | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as DBRegistration;
  },
);

export interface RegistrationsFilter {
  query?: string;
  /** 3-letter track code from `src/content/tracks.ts`. */
  trackCode?: string;
  type?: "self" | "others";
  attended?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "full_name" | "reference_number";
  sortDir?: "asc" | "desc";
}

export interface RegistrationsPage {
  rows: DBRegistration[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listRegistrations(
  filter: RegistrationsFilter = {},
): Promise<RegistrationsPage> {
  const {
    query,
    trackCode,
    type,
    attended,
    page = 1,
    pageSize = 50,
    sortBy = "created_at",
    sortDir = "desc",
  } = filter;

  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("registrations")
    .select("*", { count: "exact" })
    .order(sortBy, { ascending: sortDir === "asc" });

  if (query) {
    q = q.or(
      `full_name.ilike.%${query}%,email.ilike.%${query}%,reference_number.ilike.%${query}%`,
    );
  }
  if (trackCode) q = q.eq("track_code", trackCode.toUpperCase());
  if (type) q = q.eq("registered_via", type);
  if (attended !== undefined) q = q.eq("attended", attended);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.warn("[db.registrations] listRegistrations:", error.message);
    return { rows: [], total: 0, page, pageSize };
  }
  return {
    rows: (data ?? []) as DBRegistration[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function countAttended(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("attended", true);
  return count ?? 0;
}
