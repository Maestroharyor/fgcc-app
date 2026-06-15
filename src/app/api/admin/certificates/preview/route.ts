import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { listCertificateRecipients } from "@/lib/db/registrations";

/**
 * Eligible-recipient preview for the scheduler UI. Returns who would receive a
 * certificate for the selected days/track so the admin can review the list and
 * see the count before committing to a schedule.
 */
export async function GET(request: NextRequest) {
  await requireRole("superadmin");

  const days = (request.nextUrl.searchParams.get("days") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const track = request.nextUrl.searchParams.get("track") ?? undefined;

  if (days.length === 0) {
    return NextResponse.json({ ok: true, count: 0, recipients: [] });
  }

  const recipients = await listCertificateRecipients({
    dayKeys: days,
    trackCode: track,
  });

  return NextResponse.json({
    ok: true,
    count: recipients.length,
    recipients: recipients.map((r) => ({
      reference_number: r.reference_number,
      full_name: r.full_name,
      email: r.email,
      track_code: r.track_code,
      certificate_status: r.certificate_status,
    })),
  });
}
