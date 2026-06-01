import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getRegistrationByEmail } from "@/lib/db/registrations";
import {
  sendAdminNotificationEmail,
  sendConfirmationEmail,
} from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import { AdminRegistrationSchema } from "@/lib/validation/schemas";

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/**
 * Admin-initiated (offline) registration. Used by the dashboard's
 * "Add registration" form to enter walk-ins. Unlike the public flow there is
 * no capacity gate — an admin can add to a full track on purpose — and the
 * email is optional. Rows are stamped registered_via = 'offline'.
 */
export async function POST(request: NextRequest) {
  await requireRole("admin");

  const payload = await request.json().catch(() => ({}));

  let parsed: ReturnType<typeof AdminRegistrationSchema.parse>;
  try {
    parsed = AdminRegistrationSchema.parse(payload);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid details" },
      { status: 400 },
    );
  }

  const track = trackByCode(parsed.track_code);
  if (!track) {
    return NextResponse.json(
      { ok: false, error: "track-not-found" },
      { status: 400 },
    );
  }

  // email is UNIQUE on registrations. When a real address was captured, dedupe
  // up front and hand back the existing reference (mirrors registerSelfAction)
  // rather than letting the insert blow up with a raw constraint error.
  if (parsed.email) {
    const existing = await getRegistrationByEmail(parsed.email);
    if (existing) {
      return NextResponse.json(
        {
          ok: false,
          error: "duplicate",
          referenceNumber: existing.reference_number,
        },
        { status: 409 },
      );
    }
  }

  // The DB requires a unique, non-null email per row. Synthesise a placeholder
  // when the admin didn't capture one (mirrors the Register-for-Others flow).
  const emailToUse =
    parsed.email ??
    `noemail+${track.code.toLowerCase()}-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}@placeholder.skillup`;

  const supabase = await createSupabaseServerClient();
  const { data: inserted, error } = await supabase
    .from("registrations")
    .insert({
      full_name: parsed.full_name,
      email: emailToUse,
      phone: parsed.phone,
      gender: parsed.gender,
      age_group: parsed.age_group,
      church: parsed.church ?? null,
      track_code: track.code,
      registered_via: "offline",
      how_heard: parsed.how_heard ?? null,
    })
    .select("reference_number")
    .single();

  if (error || !inserted) {
    // Backstop for the race where two admins submit the same email at once -
    // the unique index (23505) catches what the pre-check above missed.
    if ((error as { code?: string } | null)?.code === "23505") {
      return NextResponse.json(
        { ok: false, error: "duplicate" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: error?.message ?? "Could not save registration" },
      { status: 500 },
    );
  }

  const referenceNumber = inserted.reference_number as string;

  // Comms are awaited (allSettled) so a send failure can't reject the request.
  // Only email the registrant if a real address was captured; always notify
  // admins for the audit trail.
  await Promise.allSettled([
    parsed.email
      ? sendConfirmationEmail(parsed.email, {
          firstName: firstName(parsed.full_name),
          referenceNumber,
          trackName: track.name,
          facilitatorName: track.facilitator,
          whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        })
      : Promise.resolve(),
    sendAdminNotificationEmail({
      type: "offline",
      registrants: [
        {
          fullName: parsed.full_name,
          referenceNumber,
          trackName: track.name,
          email: parsed.email ?? "",
          phone: parsed.phone,
          church: parsed.church ?? null,
        },
      ],
      dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/registrations`,
    }),
  ]);

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/registrations");

  return NextResponse.json({ ok: true, referenceNumber });
}
