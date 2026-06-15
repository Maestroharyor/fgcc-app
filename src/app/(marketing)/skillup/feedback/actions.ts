"use server";

import { ZodError, type z } from "zod";
import { TRACKS } from "@/content/tracks";
import { sendFeedbackNotificationEmail } from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { type FeedbackInput, FeedbackSchema } from "@/lib/validation/schemas";

export interface FeedbackActionResult {
  ok: boolean;
  message?: string;
}

// Accept the schema's INPUT shape - callers (the RHF form) hand us values
// before transforms run. We parse internally to get the OUTPUT shape.
export async function submitFeedbackAction(
  payload: z.input<typeof FeedbackSchema>,
): Promise<FeedbackActionResult> {
  const t0 = Date.now();
  console.log("[feedback] ▶ start");

  let parsed: FeedbackInput;
  try {
    parsed = FeedbackSchema.parse(payload);
    console.log("[feedback] ✓ validated", {
      reference_number: parsed.reference_number,
      overall_rating: parsed.overall_rating,
      track_rating: parsed.track_rating,
      facilitator_rating: parsed.facilitator_rating,
      attend_next: parsed.attend_next,
      share_as_testimonial: parsed.share_as_testimonial,
    });
  } catch (e) {
    console.error("[feedback] ✗ validation failed:", e);
    return {
      ok: false,
      message:
        e instanceof ZodError
          ? (e.issues[0]?.message ?? "Please review the form and try again.")
          : e instanceof Error
            ? e.message
            : "Please review the form and try again.",
    };
  }

  // Admin client because we need to read registrations (RLS-gated to admin
  // only) to resolve reference_number → id, and INSERT...RETURNING would
  // otherwise be blocked for anon. Server-action is a trusted boundary.
  const supabase = createSupabaseAdminClient();

  // Resolve the registration by whichever identifier the participant used.
  const byEmail = parsed.lookup === "email";
  console.log("[feedback] → lookup registration", {
    lookup: parsed.lookup,
    reference_number: parsed.reference_number,
    email: parsed.email,
  });
  const lookupQuery = supabase
    .from("registrations")
    .select("id, full_name, email, track_code, reference_number");
  const { data: reg, error: regError } = await (byEmail
    ? lookupQuery.eq("email", parsed.email ?? "")
    : lookupQuery.eq("reference_number", parsed.reference_number ?? "")
  ).maybeSingle();

  const notFoundMessage = byEmail
    ? "We couldn't find a registration for that email."
    : "Reference not found.";
  if (regError) {
    console.error("[feedback] ✗ registration lookup failed:", regError);
    return { ok: false, message: notFoundMessage };
  }
  if (!reg) {
    console.warn("[feedback] ✗ registration not found", {
      lookup: parsed.lookup,
    });
    return { ok: false, message: notFoundMessage };
  }
  console.log("[feedback] ✓ registration found", { id: reg.id });

  console.log("[feedback] → feedback insert");
  const { error } = await supabase.from("feedback").insert({
    registration_id: reg.id,
    overall_rating: parsed.overall_rating,
    track_rating: parsed.track_rating,
    facilitator_rating: parsed.facilitator_rating,
    enjoyed_most: parsed.enjoyed_most ?? null,
    improvements: parsed.improvements ?? null,
    attend_next: parsed.attend_next ?? null,
    testimony: parsed.testimony ?? null,
    share_as_testimonial: parsed.share_as_testimonial,
  });

  if (error) {
    console.error("[feedback] ✗ insert failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { ok: false, message: error.message };
  }

  // Notify admins out-of-band. Wrapped so a comms hiccup never blocks the
  // participant (per AGENTS.md §8) - we've already persisted the feedback.
  const trackName =
    TRACKS.find((t) => t.code === reg.track_code)?.name ?? "SkillUp track";
  await Promise.allSettled([
    sendFeedbackNotificationEmail({
      fullName: reg.full_name,
      email: reg.email,
      referenceNumber: reg.reference_number,
      trackName,
      overallRating: parsed.overall_rating,
      trackRating: parsed.track_rating,
      facilitatorRating: parsed.facilitator_rating,
      enjoyedMost: parsed.enjoyed_most ?? null,
      improvements: parsed.improvements ?? null,
      attendNext: parsed.attend_next ?? null,
      testimony: parsed.testimony ?? null,
      shareAsTestimonial: parsed.share_as_testimonial,
      submittedAtIso: new Date().toISOString(),
    }),
  ]);

  console.log("[feedback] ⤵ success", { duration_ms: Date.now() - t0 });
  return { ok: true };
}
