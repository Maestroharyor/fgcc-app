import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import type { DBRegistration } from "@/lib/db/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils/date";
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
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("reference_number", parsed.reference_number)
    .maybeSingle();
  const row = data as DBRegistration | null;

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

  // One check-in per Lagos calendar day. Rows from before migration 005 have
  // no log; their single attended_at stands in for it.
  const log: string[] = Array.isArray(row.attendance_log)
    ? row.attendance_log
    : row.attended_at
      ? [row.attended_at]
      : [];
  const now = new Date();
  const today = formatDate(now, "yyyy-MM-dd");
  const alreadyToday = log.some(
    (d) => formatDate(new Date(d), "yyyy-MM-dd") === today,
  );

  if (alreadyToday) {
    return NextResponse.json({
      ok: false,
      alreadyChecked: true,
      daysAttended: log.length,
      registrant,
    });
  }

  const nowIso = now.toISOString();
  let { error: updErr } = await supabase
    .from("registrations")
    .update({
      attended: true,
      attended_at: nowIso,
      attendance_log: [...log, nowIso],
    })
    .eq("id", row.id);

  if (updErr) {
    // attendance_log may not exist yet (migration 005 unapplied) — fall back
    // to the legacy single-day update so check-in keeps working.
    ({ error: updErr } = await supabase
      .from("registrations")
      .update({ attended: true, attended_at: nowIso })
      .eq("id", row.id));
  }

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    daysAttended: log.length + 1,
    registrant,
  });
}

/**
 * Undo a mistaken check-in: removes *today's* entries from the attendance log,
 * mirroring the per-Lagos-day boundary used by POST. If no earlier day remains
 * the registrant flips back to not-attended.
 */
export async function DELETE(request: NextRequest) {
  await requireRole("admin");

  const payload = await request.json().catch(() => ({}));
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
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("reference_number", parsed.reference_number)
    .maybeSingle();
  const row = data as DBRegistration | null;

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

  const log: string[] = Array.isArray(row.attendance_log)
    ? row.attendance_log
    : row.attended_at
      ? [row.attended_at]
      : [];
  const today = formatDate(new Date(), "yyyy-MM-dd");
  const newLog = log.filter(
    (d) => formatDate(new Date(d), "yyyy-MM-dd") !== today,
  );

  const update = newLog.length
    ? { attended: true, attended_at: newLog.at(-1), attendance_log: newLog }
    : { attended: false, attended_at: null, attendance_log: [] };

  let { error: updErr } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", row.id);

  if (updErr) {
    // attendance_log column may not exist yet (migration 005 unapplied) — fall
    // back to clearing the legacy single-day fields.
    ({ error: updErr } = await supabase
      .from("registrations")
      .update({
        attended: newLog.length > 0,
        attended_at: newLog.at(-1) ?? null,
      })
      .eq("id", row.id));
  }

  if (updErr) {
    return NextResponse.json(
      { ok: false, error: updErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    attended: newLog.length > 0,
    daysAttended: newLog.length,
    registrant,
  });
}
