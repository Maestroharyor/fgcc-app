import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { sendRegistrationUpdatedEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import { UpdateRegistrationSchema } from "@/lib/validation/schemas";

interface RouteContext {
  params: Promise<{ id: string }>;
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/**
 * Admin edit of an existing registrant. Corrects data-entry mistakes in name,
 * email, phone, gender, age group, or church. Track is not editable here (it
 * affects capacity/session counts). Email is UNIQUE citext on registrations, so
 * a change that collides with another row surfaces as a 23505 → 409.
 */
export async function PATCH(request: NextRequest, { params }: RouteContext) {
  await requireRole("admin");
  const { id } = await params;

  const payload = await request.json().catch(() => ({}));

  const parsed = UpdateRegistrationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid details",
      },
      { status: 400 },
    );
  }

  // `notify` is a UI flag, not a column — destructure it out of the DB payload.
  const { full_name, email, phone, gender, age_group, church, notify } =
    parsed.data;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .update({
      full_name,
      email,
      phone: phone ?? null,
      gender,
      age_group,
      church,
    })
    .eq("id", id)
    .select("id, reference_number, track_code, full_name")
    .maybeSingle();

  if (error) {
    // 23505 = unique violation on the email column.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { ok: false, error: "email-taken" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "update-failed" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { ok: false, error: "not-found" },
      { status: 404 },
    );
  }

  // Notify the registrant of the change when asked and a real email is on file
  // (offline rows carry a synthesised @placeholder.skillup address — skip those).
  // allSettled so a send failure can never reject the request.
  if (notify && !email.endsWith("@placeholder.skillup")) {
    const track = trackByCode(data.track_code);
    await Promise.allSettled([
      sendRegistrationUpdatedEmail(email, {
        firstName: firstName(full_name),
        referenceNumber: data.reference_number,
        trackName: track?.name ?? data.track_code,
        email,
        phone: phone ?? null,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      }),
    ]);
  }

  revalidatePath(`/admin/registrations/${id}`);
  revalidatePath("/admin/registrations");
  revalidatePath("/admin/dashboard");

  return NextResponse.json({ ok: true });
}
