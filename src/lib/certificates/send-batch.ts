import { TRACKS } from "@/content/tracks";
import { sendCertificateEmail } from "@/lib/email/send";
import {
  buildCertificate,
  type CertificateSignatory,
} from "@/lib/pdf/certificate";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/** Registrant fields the batch sender needs to build + stamp a certificate. */
export interface CertificateSendRow {
  id: string;
  full_name: string;
  /** Resolved delivery address (own email, or the registrar's for no-email rows). */
  email: string;
  reference_number: string;
  track_code: string;
  certificate_attempts?: number | null;
  /** True when `email` is the registrar's address (the participant had none). */
  via_registrar?: boolean;
}

export interface SendBatchResult {
  sent: number;
  failed: number;
  skipped: number;
}

export interface SendBatchOptions {
  /** Pause between sends to stay under Resend's ~2 req/s rate limit. */
  throttleMs?: number;
  nowIso?: string;
}

function trackName(code: string | null | undefined): string {
  return TRACKS.find((t) => t.code === code)?.name ?? "SkillUp track";
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Build + email a certificate for each row, stamping the outcome on the
 * registration via the service-role client. Success sets
 * `certificate_status='sent'` + `certificate_sent_at` and clears the error;
 * failure sets `certificate_status='failed'` + the error message. Either way
 * `certificate_attempts` is incremented. Placeholder emails are skipped
 * (counted separately) and never stamped.
 *
 * Reused by the daily cron, the manual "send now" button, and single resends.
 */
export async function sendCertificateBatch(
  rows: CertificateSendRow[],
  signatory: CertificateSignatory | null,
  { throttleMs = 600, nowIso }: SendBatchOptions = {},
): Promise<SendBatchResult> {
  const supabase = createSupabaseAdminClient();
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i];
    if (r.email.endsWith("@placeholder.skillup")) {
      skipped += 1;
      continue;
    }

    const name = trackName(r.track_code);
    const attempts = (r.certificate_attempts ?? 0) + 1;
    let errorMessage: string | null = null;

    try {
      const pdf = await buildCertificate({
        fullName: r.full_name,
        referenceNumber: r.reference_number,
        trackName: name,
        signatory,
      });
      const result = await sendCertificateEmail(
        r.email,
        {
          firstName: firstName(r.full_name),
          trackName: name,
          registeredByNote: r.via_registrar
            ? `You're receiving this because you registered ${r.full_name} for SkillUp 1.0.`
            : null,
        },
        pdf,
      );
      if (!result.ok) errorMessage = result.error ?? "Send failed";
    } catch (e) {
      errorMessage = e instanceof Error ? e.message : String(e);
    }

    // Cast to `never` while DB types are hand-rolled - mirrors the reminder cron.
    const patch =
      errorMessage === null
        ? {
            certificate_status: "sent",
            certificate_sent_at: nowIso ?? new Date().toISOString(),
            certificate_error: null,
            certificate_attempts: attempts,
          }
        : {
            certificate_status: "failed",
            certificate_error: errorMessage,
            certificate_attempts: attempts,
          };
    await supabase
      .from("registrations")
      .update(patch as never)
      .eq("id", r.id);

    if (errorMessage === null) sent += 1;
    else failed += 1;

    if (throttleMs > 0 && i < rows.length - 1) await sleep(throttleMs);
  }

  return { sent, failed, skipped };
}
