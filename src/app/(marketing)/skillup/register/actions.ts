"use server";

import { revalidatePath } from "next/cache";
import { ZodError, type z } from "zod";
import { TRACKS_BY_CODE, trackByCode } from "@/content/tracks";
import { getTrackCount } from "@/lib/db/tracks";
import { nextWaitlistPosition } from "@/lib/db/waitlist";
import {
  sendAdminNotificationEmail,
  sendConfirmationEmail,
  sendSubmitterSummaryEmail,
  sendWaitlistConfirmEmail,
} from "@/lib/email/send";
import { qrDataUrl } from "@/lib/qr/generate";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import {
  type RegisterOthersInput,
  RegisterOthersSchema,
  type RegistrationInput,
  RegistrationSchema,
} from "@/lib/validation/schemas";

/** Surface the first field-level Zod issue as a friendly sentence. */
function friendlyZodMessage(
  e: unknown,
  fallback = "Please check your form and try again.",
): string {
  if (e instanceof ZodError) {
    return e.issues[0]?.message ?? fallback;
  }
  if (e instanceof Error) return e.message;
  return fallback;
}

export interface ActionResult {
  ok: boolean;
  error?: "duplicate" | "track-not-found" | "waitlisted" | "unknown";
  referenceNumber?: string;
  batchId?: string;
  message?: string;
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/**
 * Resolve a track via static content + a single-track count query. Returns
 * `null` if the code isn't in `src/content/tracks.ts` (validation should catch
 * this earlier, but defence in depth).
 */
async function resolveTrack(code: string) {
  const track = trackByCode(code);
  if (!track) return null;
  const currentCount = await getTrackCount(track.code);
  return {
    code: track.code,
    name: track.name,
    facilitator: track.facilitator,
    capacity: track.capacity,
    whatsappUrl: track.whatsappUrl,
    currentCount,
    isFull: currentCount >= track.capacity,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  registerSelfAction — single registration via the public form.
// ─────────────────────────────────────────────────────────────────────────────
export async function registerSelfAction(
  formData: FormData,
): Promise<ActionResult> {
  let parsed: RegistrationInput;
  try {
    parsed = RegistrationSchema.parse(Object.fromEntries(formData));
  } catch (e) {
    return { ok: false, error: "unknown", message: friendlyZodMessage(e) };
  }

  const supabase = await createSupabaseServerClient();

  // Dedupe by email — return existing reference if any.
  const { data: existing } = await supabase
    .from("registrations")
    .select("reference_number")
    .eq("email", parsed.email)
    .maybeSingle();

  if (existing?.reference_number) {
    return {
      ok: false,
      error: "duplicate",
      referenceNumber: existing.reference_number,
      message: "You're already registered. Showing your existing record.",
    };
  }

  const track = await resolveTrack(parsed.track_code);
  if (!track) {
    return { ok: false, error: "track-not-found", message: "Track not found." };
  }

  // Full → waitlist branch.
  if (track.isFull) {
    const position = await nextWaitlistPosition(track.code);
    const { error } = await supabase.from("waitlist").insert({
      track_code: track.code,
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      gender: parsed.gender,
      age_group: parsed.age_group,
      church: parsed.church ?? null,
      position,
    });
    if (error) {
      return { ok: false, error: "unknown", message: error.message };
    }
    await sendWaitlistConfirmEmail(parsed.email, {
      firstName: firstName(parsed.full_name),
      trackName: track.name,
      position,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
    revalidatePath("/skillup");
    return {
      ok: false,
      error: "waitlisted",
      message: "Track is full — you're on the waitlist.",
    };
  }

  const { data: inserted, error } = await supabase
    .from("registrations")
    .insert({
      full_name: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone,
      gender: parsed.gender,
      age_group: parsed.age_group,
      church: parsed.church ?? null,
      track_code: track.code,
      registered_via: "self",
      how_heard: parsed.how_heard ?? null,
    })
    .select("reference_number")
    .single();

  if (error || !inserted) {
    return {
      ok: false,
      error: "unknown",
      message: error?.message ?? "Could not save your registration.",
    };
  }

  const ref = inserted.reference_number;

  // Fire-and-forget emails — we don't block the redirect.
  const qr = await qrDataUrl(ref).catch(() => "");
  await Promise.allSettled([
    sendConfirmationEmail(parsed.email, {
      firstName: firstName(parsed.full_name),
      referenceNumber: ref,
      trackName: track.name,
      facilitatorName: track.facilitator,
      whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
      qrDataUrl: qr,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    }),
    sendAdminNotificationEmail({
      type: "self",
      registrants: [
        {
          fullName: parsed.full_name,
          referenceNumber: ref,
          trackName: track.name,
          email: parsed.email,
          phone: parsed.phone,
          church: parsed.church ?? null,
        },
      ],
      dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/registrations`,
    }),
  ]);

  revalidatePath("/skillup");
  return { ok: true, referenceNumber: ref };
}

// ─────────────────────────────────────────────────────────────────────────────
//  registerOthersAction — batch registration on behalf of others.
// ─────────────────────────────────────────────────────────────────────────────
export async function registerOthersAction(
  // Accept the schema's INPUT shape — RHF passes pre-transform values.
  payload: z.input<typeof RegisterOthersSchema>,
): Promise<ActionResult> {
  let parsed: RegisterOthersInput;
  try {
    parsed = RegisterOthersSchema.parse(payload);
  } catch (e) {
    return {
      ok: false,
      error: "unknown",
      message: friendlyZodMessage(e, "Please check your form and try again."),
    };
  }

  const supabase = await createSupabaseServerClient();

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .insert({
      submitter_name: parsed.submitter.submitter_name,
      submitter_email: parsed.submitter.submitter_email,
      submitter_phone: parsed.submitter.submitter_phone,
      relationship: parsed.submitter.relationship,
      church: parsed.submitter.church ?? null,
      total_registrants: parsed.registrants.length,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      ok: false,
      error: "unknown",
      message: batchError?.message ?? "Could not create batch.",
    };
  }

  // Process each registrant one at a time so capacity / waitlist logic is honoured per row.
  const summary: Array<{
    fullName: string;
    referenceNumber: string;
    trackName: string;
    email: string;
    phone: string;
    church: string | null;
    whatsappUrl: string;
    waitlisted: boolean;
  }> = [];

  for (const r of parsed.registrants) {
    const track = await resolveTrack(r.track_code);
    if (!track) continue;

    if (track.isFull) {
      const position = await nextWaitlistPosition(track.code);
      await supabase.from("waitlist").insert({
        track_code: track.code,
        full_name: r.full_name,
        email:
          r.email ??
          `noemail+${Math.random().toString(36).slice(2)}@placeholder.skillup`,
        phone: r.phone,
        gender: r.gender,
        age_group: r.age_group,
        church: r.church ?? null,
        position,
      });
      summary.push({
        fullName: r.full_name,
        referenceNumber: `WAITLIST #${position}`,
        trackName: track.name,
        email: r.email ?? "",
        phone: r.phone,
        church: r.church ?? null,
        whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
        waitlisted: true,
      });
      continue;
    }

    // Synthesise a unique placeholder email when none provided — the DB
    // requires a unique email per row.
    const emailToUse =
      r.email ??
      `noemail+${track.code.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@placeholder.skillup`;

    const { data: inserted, error } = await supabase
      .from("registrations")
      .insert({
        full_name: r.full_name,
        email: emailToUse,
        phone: r.phone,
        gender: r.gender,
        age_group: r.age_group,
        church: r.church ?? null,
        track_code: track.code,
        registered_via: "others",
        batch_id: batch.id,
      })
      .select("reference_number")
      .single();

    if (error || !inserted) {
      console.warn("[registerOthersAction] insert failed:", error?.message);
      continue;
    }

    const ref = inserted.reference_number;
    summary.push({
      fullName: r.full_name,
      referenceNumber: ref,
      trackName: track.name,
      email: r.email ?? "",
      phone: r.phone,
      church: r.church ?? null,
      whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
      waitlisted: false,
    });

    if (r.email) {
      const qr = await qrDataUrl(ref).catch(() => "");
      await sendConfirmationEmail(r.email, {
        firstName: firstName(r.full_name),
        referenceNumber: ref,
        trackName: track.name,
        facilitatorName: track.facilitator,
        whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
        qrDataUrl: qr,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      });
    }
  }

  await Promise.allSettled([
    sendSubmitterSummaryEmail(parsed.submitter.submitter_email, {
      submitterName: firstName(parsed.submitter.submitter_name),
      registrants: summary.map((s) => ({
        fullName: s.fullName,
        referenceNumber: s.referenceNumber,
        trackName: s.trackName,
        whatsappUrl: s.whatsappUrl,
      })),
    }),
    sendAdminNotificationEmail({
      type: "others",
      registrants: summary.map((s) => ({
        fullName: s.fullName,
        referenceNumber: s.referenceNumber,
        trackName: s.trackName,
        email: s.email,
        phone: s.phone,
        church: s.church,
      })),
      submitter: {
        name: parsed.submitter.submitter_name,
        email: parsed.submitter.submitter_email,
        phone: parsed.submitter.submitter_phone,
        relationship: parsed.submitter.relationship,
        church: parsed.submitter.church ?? null,
      },
      dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/registrations`,
    }),
  ]);

  // Silence unused-import warning when TRACKS_BY_CODE isn't otherwise hit.
  void TRACKS_BY_CODE;

  revalidatePath("/skillup");
  return { ok: true, batchId: batch.id };
}
