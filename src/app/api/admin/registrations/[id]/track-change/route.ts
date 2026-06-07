import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { type Track, trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import {
  createActionCode,
  verifyAndConsumeActionCode,
} from "@/lib/db/action-codes";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import {
  sendAdminActionCodeEmail,
  sendTrackChangedEmail,
} from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import {
  TrackChangeConfirmSchema,
  TrackChangeRequestSchema,
} from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

interface RegistrationRow {
  id: string;
  full_name: string;
  email: string;
  track_code: string;
  reference_number: string;
}

async function loadRegistration(id: string): Promise<RegistrationRow | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select("id, full_name, email, track_code, reference_number")
    .eq("id", id)
    .maybeSingle();
  return (data as RegistrationRow | null) ?? null;
}

type ResolveTargetResult =
  | { ok: false; response: NextResponse }
  | { ok: true; target: Track };

/**
 * Validate a track-change target: it must exist, differ from the current
 * track, and have room (closed tracks read as full). Returns the static track
 * or an error response.
 */
async function resolveTarget(
  current: string,
  code: string,
): Promise<ResolveTargetResult> {
  const target = trackByCode(code);
  if (!target) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "track-not-found" },
        { status: 404 },
      ),
    };
  }
  if (target.code === current.toUpperCase()) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "same-track" },
        { status: 400 },
      ),
    };
  }
  const capacity = withCapacity(await getTrackCounts()).find(
    (t) => t.code === target.code,
  );
  if (capacity?.is_full) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: "track-full" },
        { status: 409 },
      ),
    };
  }
  return { ok: true, target };
}

/**
 * Step 1: email a 6-char confirmation code to the logged-in admin. The track
 * change itself only happens in PATCH once the code is verified.
 */
export async function POST(request: NextRequest, { params }: RouteContext) {
  const session = await requireRole("admin");
  const { id } = await params;

  const parsed = TrackChangeRequestSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid track" },
      { status: 400 },
    );
  }
  if (!session.email) {
    return NextResponse.json(
      { ok: false, error: "admin-no-email" },
      { status: 400 },
    );
  }

  const registration = await loadRegistration(id);
  if (!registration) {
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 },
    );
  }

  const resolved = await resolveTarget(
    registration.track_code,
    parsed.data.track_code,
  );
  if (!resolved.ok) return resolved.response;
  const target = resolved.target;

  const created = await createActionCode({
    registrationId: registration.id,
    adminUserId: session.userId,
    action: "track_change",
    payload: { new_track_code: target.code },
  });
  if (!created.ok) {
    return NextResponse.json(
      { ok: false, error: "code-create-failed" },
      { status: 500 },
    );
  }

  const fromName =
    trackByCode(registration.track_code)?.name ?? registration.track_code;
  const emailResult = await sendAdminActionCodeEmail(session.email, {
    code: created.code,
    actionLabel: "Change track",
    registrantName: registration.full_name,
    detail: `${fromName} -> ${target.name}`,
    expiresMinutes: created.expiresMinutes,
  });
  if (!emailResult.ok) {
    return NextResponse.json(
      { ok: false, error: emailResult.error ?? "email-failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

/**
 * Step 2: verify the emailed code and apply the change. The DB trigger
 * regenerates the reference number for the new track; the registrant gets an
 * email with the new track, reference, and WhatsApp link.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const session = await requireRole("admin");
  const { id } = await params;

  const parsed = TrackChangeConfirmSchema.safeParse(
    await request.json().catch(() => ({})),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid code" },
      { status: 400 },
    );
  }

  const registration = await loadRegistration(id);
  if (!registration) {
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 },
    );
  }

  // Re-check the target BEFORE consuming the code, so a track that filled up
  // between request and confirm doesn't burn the admin's code.
  const resolved = await resolveTarget(
    registration.track_code,
    parsed.data.track_code,
  );
  if (!resolved.ok) return resolved.response;
  const target = resolved.target;

  const verified = await verifyAndConsumeActionCode({
    registrationId: registration.id,
    adminUserId: session.userId,
    action: "track_change",
    code: parsed.data.code,
  });
  if (!verified.ok) {
    return NextResponse.json(
      { ok: false, error: verified.error },
      { status: 400 },
    );
  }
  if (verified.payload.new_track_code !== target.code) {
    // The code was issued for a different target track.
    return NextResponse.json(
      { ok: false, error: "code-mismatch" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .update({ track_code: target.code })
    .eq("id", registration.id)
    .select("reference_number")
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json(
      { ok: false, error: "update-failed" },
      { status: 500 },
    );
  }
  const newReference = (data as { reference_number: string }).reference_number;

  // allSettled so a comms hiccup never blocks the admin's confirmation.
  if (!registration.email.endsWith("@placeholder.skillup")) {
    await Promise.allSettled([
      sendTrackChangedEmail(registration.email, {
        firstName: firstName(registration.full_name),
        trackName: target.name,
        facilitatorName: target.facilitator,
        referenceNumber: newReference,
        whatsappUrl: target.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    ]);
  }

  revalidatePath(`/admin/registrations/${registration.id}`);
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({ ok: true, reference_number: newReference });
}
