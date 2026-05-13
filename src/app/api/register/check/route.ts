import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ found: false }, { status: 200 });
  }
  try {
    // Admin client because anon has no SELECT policy on registrations.
    // This endpoint only returns reference_number + full_name + track_name
    // for the queried email — same shape the user would see in their own
    // confirmation email. The probe is rate-limited by the form's debounce.
    const supabase = createSupabaseAdminClient();
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
