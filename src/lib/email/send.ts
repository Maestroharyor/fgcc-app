import type { ReactElement } from "react";
import AdminNotificationEmail, {
  type AdminNotificationEmailProps,
} from "@/emails/AdminNotificationEmail";
import CertificateEmail, {
  type CertificateEmailProps,
} from "@/emails/CertificateEmail";
import ConfirmationEmail, {
  type ConfirmationEmailProps,
} from "@/emails/ConfirmationEmail";
import EnquiryAckEmail, {
  type EnquiryAckEmailProps,
} from "@/emails/EnquiryAckEmail";
import EnquiryNotificationEmail, {
  type EnquiryNotificationEmailProps,
} from "@/emails/EnquiryNotificationEmail";
import FeedbackRequestEmail, {
  type FeedbackRequestEmailProps,
} from "@/emails/FeedbackRequestEmail";
import Reminder1DayEmail, {
  type Reminder1DayEmailProps,
} from "@/emails/Reminder1DayEmail";
import Reminder3DayEmail, {
  type Reminder3DayEmailProps,
} from "@/emails/Reminder3DayEmail";
import SubmitterSummaryEmail, {
  type SubmitterSummaryEmailProps,
} from "@/emails/SubmitterSummaryEmail";
import WaitlistConfirmEmail, {
  type WaitlistConfirmEmailProps,
} from "@/emails/WaitlistConfirmEmail";
import WaitlistOfferEmail, {
  type WaitlistOfferEmailProps,
} from "@/emails/WaitlistOfferEmail";
import { adminNotificationEmails, env } from "@/lib/utils/env";
import { isEmailConfigured, resendClient } from "./client";

interface SendArgs<P> {
  to: string | string[];
  subject: string;
  Component: (props: P) => ReactElement;
  props: P;
  attachments?: Array<{ filename: string; content: Buffer | string }>;
  /** Optional Reply-To header. Used by admin notifications so the response goes to the enquirer. */
  replyTo?: string | string[];
}

async function dispatch<P>({
  to,
  subject,
  Component,
  props,
  attachments,
  replyTo,
}: SendArgs<P>): Promise<{ ok: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    console.warn(
      `[email] Skipping send to ${Array.isArray(to) ? to.join(",") : to} - Resend not configured.`,
    );
    return { ok: false, error: "resend-not-configured" };
  }
  try {
    const { error } = await resendClient().emails.send({
      from: env.RESEND_FROM,
      to,
      subject,
      react: Component(props),
      attachments,
      replyTo,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[email] send failed:", message);
    return { ok: false, error: message };
  }
}

export function sendConfirmationEmail(
  to: string,
  props: ConfirmationEmailProps,
) {
  return dispatch({
    to,
    subject: `You're in - SkillUp 1.0 · ${props.trackName}`,
    Component: ConfirmationEmail,
    props,
  });
}

export function sendSubmitterSummaryEmail(
  to: string,
  props: SubmitterSummaryEmailProps,
) {
  return dispatch({
    to,
    subject: `Registration confirmed - you registered ${props.registrants.length} people for SkillUp 1.0`,
    Component: SubmitterSummaryEmail,
    props,
  });
}

export function sendAdminNotificationEmail(props: AdminNotificationEmailProps) {
  if (adminNotificationEmails.length === 0) {
    console.warn("[email] No ADMIN_NOTIFICATION_EMAILS configured.");
    return Promise.resolve({ ok: false, error: "no-admin-emails" });
  }
  const first = props.registrants[0];
  return dispatch({
    to: adminNotificationEmails,
    subject: first
      ? `New registration: ${first.fullName} · ${first.trackName}`
      : "New SkillUp registration",
    Component: AdminNotificationEmail,
    props,
  });
}

export function sendWaitlistConfirmEmail(
  to: string,
  props: WaitlistConfirmEmailProps,
) {
  return dispatch({
    to,
    subject: `You're on the waitlist - SkillUp 1.0 · ${props.trackName}`,
    Component: WaitlistConfirmEmail,
    props,
  });
}

export function sendWaitlistOfferEmail(
  to: string,
  props: WaitlistOfferEmailProps,
) {
  return dispatch({
    to,
    subject: `A spot just opened - SkillUp 1.0 · ${props.trackName}`,
    Component: WaitlistOfferEmail,
    props,
  });
}

export function sendReminder3DayEmail(
  to: string,
  props: Reminder3DayEmailProps,
) {
  return dispatch({
    to,
    subject: `SkillUp 1.0 is in 3 days - ${props.trackName}`,
    Component: Reminder3DayEmail,
    props,
  });
}

export function sendReminder1DayEmail(
  to: string,
  props: Reminder1DayEmailProps,
) {
  return dispatch({
    to,
    subject: "SkillUp 1.0 starts tomorrow",
    Component: Reminder1DayEmail,
    props,
  });
}

export function sendFeedbackRequestEmail(
  to: string,
  props: FeedbackRequestEmailProps,
) {
  return dispatch({
    to,
    subject: "How was SkillUp 1.0? We'd love your feedback",
    Component: FeedbackRequestEmail,
    props,
  });
}

export function sendEnquiryAckEmail(to: string, props: EnquiryAckEmailProps) {
  return dispatch({
    to,
    subject: `We got your message - SkillUp 1.0 · ${props.subject}`,
    Component: EnquiryAckEmail,
    props,
  });
}

/**
 * Notify the SkillUp inbox(es) of a new enquiry. Falls back to a hard-coded
 * support address if ADMIN_NOTIFICATION_EMAILS is empty so we never lose an
 * incoming message — and sets reply-to to the enquirer for one-click response.
 */
export function sendEnquiryNotificationEmail(
  props: EnquiryNotificationEmailProps,
) {
  const recipients =
    adminNotificationEmails.length > 0
      ? adminNotificationEmails
      : ["skillup@fgccement.org"];
  return dispatch({
    to: recipients,
    subject: `New enquiry: ${props.fullName} · ${props.subject}`,
    Component: EnquiryNotificationEmail,
    props,
    replyTo: props.email,
  });
}

export function sendCertificateEmail(
  to: string,
  props: CertificateEmailProps,
  pdfBuffer: Buffer,
) {
  return dispatch({
    to,
    subject: "Your SkillUp 1.0 certificate of participation",
    Component: CertificateEmail,
    props,
    attachments: [
      {
        filename: `SkillUp-1.0-Certificate.pdf`,
        content: pdfBuffer,
      },
    ],
  });
}
