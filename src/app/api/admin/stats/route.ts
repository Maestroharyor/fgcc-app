import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET() {
  await requireRole("admin");
  const supabase = await createSupabaseRouteClient();
  const [reg, attended, waitlist, capacity] = await Promise.all([
    supabase
      .from("registrations")
      .select("registered_via", { count: "exact", head: false }),
    supabase
      .from("registrations")
      .select("*", { count: "exact", head: true })
      .eq("attended", true),
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase.from("v_track_capacity").select("*"),
  ]);
  const all = (reg.data ?? []) as Array<{ registered_via: string }>;
  return NextResponse.json({
    total: reg.count ?? 0,
    self: all.filter((r) => r.registered_via === "self").length,
    others: all.filter((r) => r.registered_via === "others").length,
    attended: attended.count ?? 0,
    waitlist: waitlist.count ?? 0,
    capacity: capacity.data ?? [],
  });
}
