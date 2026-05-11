"use server";

import { ZodError, type z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { type FeedbackInput, FeedbackSchema } from "@/lib/validation/schemas";

export interface FeedbackActionResult {
  ok: boolean;
  message?: string;
}

// Accept the schema's INPUT shape — callers (the RHF form) hand us values
// before transforms run. We parse internally to get the OUTPUT shape.
export async function submitFeedbackAction(
  payload: z.input<typeof FeedbackSchema>,
): Promise<FeedbackActionResult> {
  let parsed: FeedbackInput;
  try {
    parsed = FeedbackSchema.parse(payload);
  } catch (e) {
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

  const supabase = await createSupabaseServerClient();
  const { data: reg, error: regError } = await supabase
    .from("registrations")
    .select("id")
    .eq("reference_number", parsed.reference_number)
    .maybeSingle();

  if (regError || !reg) {
    return { ok: false, message: "Reference not found." };
  }

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
    return { ok: false, message: error.message };
  }
  return { ok: true };
}
