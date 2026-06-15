import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { getCertificateAudience } from "@/lib/db/registrations";

/**
 * Audience preview for the scheduler UI. Returns the email-eligible recipients
 * (attended + real email) for an optional track, plus the no-email and
 * already-sent tallies so the admin understands the count before scheduling.
 */
export async function GET(request: NextRequest) {
  await requireRole("superadmin");

  const track = request.nextUrl.searchParams.get("track") ?? undefined;
  const includeRegistrar =
    request.nextUrl.searchParams.get("registrar") === "1";
  const { recipients, eligibleCount, viaRegistrar, noEmail, alreadySent } =
    await getCertificateAudience({ trackCode: track, includeRegistrar });

  return NextResponse.json({
    ok: true,
    count: eligibleCount,
    viaRegistrar,
    noEmail,
    alreadySent,
    recipients: recipients.map((r) => ({
      reference_number: r.reference_number,
      full_name: r.full_name,
      email: r.deliver_email ?? r.email,
      track_code: r.track_code,
      certificate_status: r.certificate_status,
      via_registrar: r.via_registrar,
    })),
  });
}
