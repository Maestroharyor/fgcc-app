"use server";

import { ZodError, type z } from "zod";
import {
  sendEnquiryAckEmail,
  sendEnquiryNotificationEmail,
} from "@/lib/email/send";
import { env } from "@/lib/utils/env";
import {
  type EnquiryInput,
  EnquirySchema,
  type EnquiryTopic,
} from "@/lib/validation/schemas";

const TOPIC_LABELS: Record<EnquiryTopic, string> = {
  registration: "Registration help",
  track: "Question about a specific track",
  church: "Church / pastoral enquiry",
  partnership: "Partnership / sponsorship",
  feedback: "General feedback",
  other: "Other",
};

export interface EnquiryActionResult {
  ok: boolean;
  message?: string;
}

/**
 * Public general-enquiry submission. The schema's input shape is what RHF
 * sends; we parse it server-side to get the canonical output shape and run
 * email dispatch via Resend. Both dispatches go through `Promise.allSettled`
 * so a comms hiccup never blocks the success state.
 */
export async function submitEnquiryAction(
  payload: z.input<typeof EnquirySchema>,
): Promise<EnquiryActionResult> {
  const t0 = Date.now();
  console.log("[enquiry] ▶ start");

  let parsed: EnquiryInput;
  try {
    parsed = EnquirySchema.parse(payload);
    console.log("[enquiry] ✓ validated", {
      email: parsed.email,
      topic: parsed.topic,
      subject_length: parsed.subject.length,
      message_length: parsed.message.length,
    });
  } catch (e) {
    console.error("[enquiry] ✗ validation failed:", e);
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

  const topicLabel = TOPIC_LABELS[parsed.topic];
  const submittedAtIso = new Date().toISOString();

  const results = await Promise.allSettled([
    sendEnquiryNotificationEmail({
      fullName: parsed.full_name,
      email: parsed.email,
      phone: parsed.phone ?? null,
      topicLabel,
      subject: parsed.subject,
      message: parsed.message,
      submittedAtIso,
    }),
    sendEnquiryAckEmail(parsed.email, {
      firstName: parsed.full_name.split(/\s+/)[0] ?? parsed.full_name,
      topicLabel,
      subject: parsed.subject,
      message: parsed.message,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    }),
  ]);
  console.log("[enquiry] ← email results", {
    notification: results[0],
    acknowledgment: results[1],
    duration_ms: Date.now() - t0,
  });

  return {
    ok: true,
    message:
      "Thanks - we got your message. Watch your inbox for a confirmation.",
  };
}
