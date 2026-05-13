import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CheckinSchema } from "@/lib/validation/schemas";

export async function POST(request: NextRequest) {
  await requireRole("admin");

  // Accept JSON or form data.
  let payload: unknown;
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    payload = await request.json().catch(() => ({}));
  } else {
    const fd = await request.formData();
    payload = Object.fromEntries(fd);
  }

  let parsed: { reference_number: string };
  try {
    parsed = CheckinSchema.parse(payload);
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: e instanceof Error ? e.message : "Invalid reference",
      },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: row, error } = await supabase
    .from("registrations")
    .select("id, reference_number, full_name, attended, track_code")
    .eq("reference_number", parsed.reference_number)
    .maybeSingle();

  if (error || !row) {
    return NextResponse.json(
      { ok: false, error: "Reference not found" },
      { status: 404 },
    );
  }

  const trackName = TRACKS.find((t) => t.code === row.track_code)?.name ?? "";
  const registrant = {
    referenceNumber: row.reference_number,
    fullName: row.full_name,
    trackName,
  };

  if (row.attended) {
    return NextResponse.json({
      ok: false,
      alreadyChecked: true,
      registrant,
    });
  }

  const { error: updErr } = await supabase
    .from("registrations")
    .update({ attended: true, attended_at: new Date().toISOString() })
    .eq("id", row.id);

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, registrant });
}
