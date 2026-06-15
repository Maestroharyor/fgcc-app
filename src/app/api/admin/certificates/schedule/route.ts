import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { assignScheduleDays, planSchedule } from "@/lib/certificates/schedule";
import { getCertificateAudience } from "@/lib/db/registrations";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { CertificateScheduleSchema } from "@/lib/validation/schemas";

/**
 * Queue certificates for scheduled sending. Splits eligible recipients into
 * per-day batches starting at `startAt` (same clock time each day), writing the
 * assigned send instant + status onto each registration (one bulk update per
 * day). Already-sent rows are never touched; pending/failed rows are re-queued
 * so the scheduler is re-runnable.
 */
export async function POST(request: NextRequest) {
  await requireRole("superadmin");
  const body = await request.json().catch(() => ({}));

  const parsed = CertificateScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid schedule",
      },
      { status: 400 },
    );
  }
  const { trackCode, perDay, startAt, includeRegistrar } = parsed.data;

  // `startAt` is a naive datetime-local value; interpret it as Lagos time.
  const startInstant = new Date(`${startAt}:00+01:00`);
  if (Number.isNaN(startInstant.getTime())) {
    return NextResponse.json(
      { ok: false, error: "Invalid start date and time" },
      { status: 400 },
    );
  }
  if (startInstant.getTime() < Date.now()) {
    return NextResponse.json(
      { ok: false, error: "Start time can't be in the past" },
      { status: 400 },
    );
  }
  const startAtIso = startInstant.toISOString();

  const { recipients } = await getCertificateAudience({
    trackCode,
    includeRegistrar,
  });
  if (recipients.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No eligible recipients for that selection" },
      { status: 404 },
    );
  }

  const groups = assignScheduleDays(
    recipients.map((r) => r.id),
    perDay,
    startAtIso,
  );

  const supabase = createSupabaseAdminClient();
  for (const group of groups) {
    const { error } = await supabase
      .from("registrations")
      .update({
        certificate_status: "scheduled",
        certificate_scheduled_for: group.sendAt,
        certificate_error: null,
      } as never)
      .in("id", group.ids);
    if (error) {
      return NextResponse.json(
        { ok: false, error: error.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    ok: true,
    totalRecipients: recipients.length,
    perDay,
    days: planSchedule(recipients.length, perDay, startAtIso),
  });
}

/** Cancel the schedule: revert not-yet-sent scheduled rows back to unqueued. */
export async function DELETE() {
  await requireRole("superadmin");
  const supabase = createSupabaseAdminClient();
  const { error, count } = await supabase
    .from("registrations")
    .update(
      {
        certificate_status: "none",
        certificate_scheduled_for: null,
        certificate_error: null,
      } as never,
      { count: "exact" },
    )
    .eq("certificate_status", "scheduled");
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true, cleared: count ?? 0 });
}
