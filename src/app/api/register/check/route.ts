import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
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
      .select("reference_number, full_name, track_code")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (!data) {
      return NextResponse.json({ found: false }, { status: 200 });
    }
    const trackName =
      TRACKS.find((t) => t.code === data.track_code)?.name ?? "";
    return NextResponse.json(
      {
        found: true,
        reference_number: data.reference_number,
        full_name: data.full_name,
        track_name: trackName,
      },
      { status: 200 },
    );
  } catch (e) {
    console.warn("[api/register/check] failed:", e);
    return NextResponse.json({ found: false }, { status: 200 });
  }
}
