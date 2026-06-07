import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { type Track, trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import { sendTrackChangedEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import { TrackChangeRequestSchema } from "@/lib/validation/schemas";

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

type ResolveTargetResult =
  | { ok: false; response: NextResponse }
  | { ok: true; target: Track };

/**
 * Validate a track-change target: it must exist, differ from the current
 * track, and have room (closed tracks read as full).
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
 * Move a registrant to another track. The DB trigger (migration 007)
 * regenerates the reference number for the new track; the registrant gets an
 * email with the new track, reference, and WhatsApp link.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  await requireRole("admin");
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

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("registrations")
    .select("id, full_name, email, track_code, reference_number")
    .eq("id", id)
    .maybeSingle();
  const registration = (data as RegistrationRow | null) ?? null;
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

  const { data: updated, error } = await supabase
    .from("registrations")
    .update({ track_code: target.code })
    .eq("id", registration.id)
    .select("reference_number")
    .maybeSingle();
  if (error || !updated) {
    return NextResponse.json(
      { ok: false, error: "update-failed" },
      { status: 500 },
    );
  }
  const newReference = (updated as { reference_number: string })
    .reference_number;

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
