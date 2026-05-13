"use server";

import { revalidatePath } from "next/cache";
import { ZodError, type z } from "zod";
import { trackByCode } from "@/content/tracks";
import { getTrackCount } from "@/lib/db/tracks";
import { nextWaitlistPosition } from "@/lib/db/waitlist";
import {
  sendAdminNotificationEmail,
  sendConfirmationEmail,
  sendSubmitterSummaryEmail,
  sendWaitlistConfirmEmail,
} from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
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
//  registerSelfAction - single registration via the public form.
// ─────────────────────────────────────────────────────────────────────────────
export async function registerSelfAction(
  formData: FormData,
): Promise<ActionResult> {
  const t0 = Date.now();
  console.log("[register:self] ▶ start");

  let parsed: RegistrationInput;
  try {
    parsed = RegistrationSchema.parse(Object.fromEntries(formData));
    console.log("[register:self] ✓ validated", {
      email: parsed.email,
      track_code: parsed.track_code,
      gender: parsed.gender,
      age_group: parsed.age_group,
    });
  } catch (e) {
    console.error("[register:self] ✗ validation failed:", e);
    return { ok: false, error: "unknown", message: friendlyZodMessage(e) };
  }

  // Use admin client (service-role) inside trusted 'use server' actions.
  // Anon RLS would block INSERT...RETURNING because the SELECT policy
  // doesn't admit anon. Zod has already validated the input above.
  const supabase = createSupabaseAdminClient();

  // Dedupe by email - return existing reference if any.
  console.log("[register:self] → dedupe query", { email: parsed.email });
  const { data: existing, error: dedupeError } = await supabase
    .from("registrations")
    .select("reference_number")
    .eq("email", parsed.email)
    .maybeSingle();

  if (dedupeError) {
    console.error("[register:self] ✗ dedupe query error:", dedupeError);
  } else {
    console.log("[register:self] ← dedupe result", {
      found: Boolean(existing),
      reference_number: existing?.reference_number ?? null,
    });
  }

  if (existing?.reference_number) {
    console.log("[register:self] ⤵ returning duplicate response", {
      duration_ms: Date.now() - t0,
    });
    return {
      ok: false,
      error: "duplicate",
      referenceNumber: existing.reference_number,
      message: "You're already registered. Showing your existing record.",
    };
  }

  console.log("[register:self] → resolve track", { code: parsed.track_code });
  const track = await resolveTrack(parsed.track_code);
  if (!track) {
    console.warn("[register:self] ✗ track not found", {
      code: parsed.track_code,
    });
    return { ok: false, error: "track-not-found", message: "Track not found." };
  }
  console.log("[register:self] ← track resolved", {
    code: track.code,
    name: track.name,
    currentCount: track.currentCount,
    capacity: track.capacity,
    isFull: track.isFull,
  });

  // Full → waitlist branch.
  if (track.isFull) {
    const position = await nextWaitlistPosition(track.code);
    console.log("[register:self] → waitlist insert", { position });
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
      console.error("[register:self] ✗ waitlist insert failed:", error);
      return { ok: false, error: "unknown", message: error.message };
    }
    console.log("[register:self] ✓ waitlisted, sending confirmation email");
    const emailResult = await sendWaitlistConfirmEmail(parsed.email, {
      firstName: firstName(parsed.full_name),
      trackName: track.name,
      position,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
    console.log("[register:self] ← waitlist email result", emailResult);
    revalidatePath("/skillup");
    console.log("[register:self] ⤵ waitlisted response", {
      duration_ms: Date.now() - t0,
    });
    return {
      ok: false,
      error: "waitlisted",
      message: "Track is full - you're on the waitlist.",
    };
  }

  console.log("[register:self] → registrations insert", {
    email: parsed.email,
    track_code: track.code,
  });
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
    console.error("[register:self] ✗ registrations insert failed:", {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
    });
    return {
      ok: false,
      error: "unknown",
      message: error?.message ?? "Could not save your registration.",
    };
  }

  const ref = inserted.reference_number;
  console.log("[register:self] ✓ inserted", { reference_number: ref });

  // Fire-and-forget emails - we don't block the redirect.
  console.log("[register:self] → sending emails");
  const emailResults = await Promise.allSettled([
    sendConfirmationEmail(parsed.email, {
      firstName: firstName(parsed.full_name),
      referenceNumber: ref,
      trackName: track.name,
      facilitatorName: track.facilitator,
      whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
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
  console.log("[register:self] ← email results", {
    confirmation: emailResults[0],
    adminNotification: emailResults[1],
  });

  revalidatePath("/skillup");
  console.log("[register:self] ⤵ success response", {
    reference_number: ref,
    duration_ms: Date.now() - t0,
  });
  return { ok: true, referenceNumber: ref };
}

// ─────────────────────────────────────────────────────────────────────────────
//  registerOthersAction - batch registration on behalf of others.
// ─────────────────────────────────────────────────────────────────────────────
export async function registerOthersAction(
  // Accept the schema's INPUT shape - RHF passes pre-transform values.
  payload: z.input<typeof RegisterOthersSchema>,
): Promise<ActionResult> {
  const t0 = Date.now();
  console.log("[register:others] ▶ start", {
    registrant_count: Array.isArray(payload?.registrants)
      ? payload.registrants.length
      : null,
  });

  let parsed: RegisterOthersInput;
  try {
    parsed = RegisterOthersSchema.parse(payload);
    console.log("[register:others] ✓ validated", {
      submitter_email: parsed.submitter.submitter_email,
      relationship: parsed.submitter.relationship,
      registrants: parsed.registrants.length,
    });
  } catch (e) {
    console.error("[register:others] ✗ validation failed:", e);
    return {
      ok: false,
      error: "unknown",
      message: friendlyZodMessage(e, "Please check your form and try again."),
    };
  }

  // Use admin client (service-role) inside trusted 'use server' actions.
  // Anon RLS would block INSERT...RETURNING because the SELECT policy
  // doesn't admit anon. Zod has already validated the input above.
  const supabase = createSupabaseAdminClient();

  console.log("[register:others] → batch insert");
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
    console.error("[register:others] ✗ batch insert failed:", {
      code: batchError?.code,
      message: batchError?.message,
      details: batchError?.details,
      hint: batchError?.hint,
    });
    return {
      ok: false,
      error: "unknown",
      message: batchError?.message ?? "Could not create batch.",
    };
  }
  console.log("[register:others] ✓ batch created", { batch_id: batch.id });

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

  for (const [idx, r] of parsed.registrants.entries()) {
    const tag = `[register:others#${idx + 1}/${parsed.registrants.length}]`;
    console.log(`${tag} → resolve track`, {
      full_name: r.full_name,
      track_code: r.track_code,
    });
    const track = await resolveTrack(r.track_code);
    if (!track) {
      console.warn(`${tag} ✗ track not found, skipping`, {
        code: r.track_code,
      });
      continue;
    }
    console.log(`${tag} ← track resolved`, {
      code: track.code,
      currentCount: track.currentCount,
      capacity: track.capacity,
      isFull: track.isFull,
    });

    if (track.isFull) {
      const position = await nextWaitlistPosition(track.code);
      console.log(`${tag} → waitlist insert`, { position });
      const { error: wlError } = await supabase.from("waitlist").insert({
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
      if (wlError) {
        console.error(`${tag} ✗ waitlist insert failed:`, wlError);
      } else {
        console.log(`${tag} ✓ waitlisted`, { position });
      }
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

    // Synthesise a unique placeholder email when none provided - the DB
    // requires a unique email per row.
    const emailToUse =
      r.email ??
      `noemail+${track.code.toLowerCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@placeholder.skillup`;

    console.log(`${tag} → registrations insert`, {
      email: emailToUse,
      track_code: track.code,
      synthesised_email: !r.email,
    });
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
      console.error(`${tag} ✗ insert failed:`, {
        code: error?.code,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
      });
      continue;
    }

    const ref = inserted.reference_number;
    console.log(`${tag} ✓ inserted`, { reference_number: ref });
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
      const emailResult = await sendConfirmationEmail(r.email, {
        firstName: firstName(r.full_name),
        referenceNumber: ref,
        trackName: track.name,
        facilitatorName: track.facilitator,
        whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
        siteUrl: env.NEXT_PUBLIC_SITE_URL,
      });
      console.log(`${tag} ← confirmation email`, emailResult);
    } else {
      console.log(`${tag} ↷ no email on record, skipping confirmation send`);
    }
  }
  console.log("[register:others] ← loop done", {
    summary_count: summary.length,
    waitlisted: summary.filter((s) => s.waitlisted).length,
  });

  console.log("[register:others] → submitter summary + admin notification");
  const batchEmailResults = await Promise.allSettled([
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
  console.log("[register:others] ← email results", {
    submitterSummary: batchEmailResults[0],
    adminNotification: batchEmailResults[1],
  });

  revalidatePath("/skillup");
  console.log("[register:others] ⤵ success response", {
    batch_id: batch.id,
    duration_ms: Date.now() - t0,
  });
  return { ok: true, batchId: batch.id };
}
