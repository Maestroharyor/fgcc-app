import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "@/lib/supabase/route";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ found: false }, { status: 200 });
  }
  try {
    const supabase = await createSupabaseRouteClient();
    const { data } = await supabase
      .from("registrations")
      .select("reference_number, full_name, track_id, tracks(name)")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ found: false }, { status: 200 });
    }
    return NextResponse.json(
      {
        found: true,
        reference_number: data.reference_number,
        full_name: data.full_name,
        track_name:
          // Supabase returns joined "tracks" as an object or array depending on cardinality.
          Array.isArray((data as { tracks?: unknown }).tracks)
            ? ((data as { tracks: Array<{ name: string }> }).tracks[0]?.name ??
              "")
            : ((data as { tracks?: { name?: string } }).tracks?.name ?? ""),
      },
      { status: 200 },
    );
  } catch (e) {
    console.warn("[api/register/check] failed:", e);
    return NextResponse.json({ found: false }, { status: 200 });
  }
}
