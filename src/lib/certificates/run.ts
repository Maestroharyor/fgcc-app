import { dueCertificates } from "@/lib/db/registrations";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { MAX_PER_DAY } from "./schedule";
import { type SendBatchResult, sendCertificateBatch } from "./send-batch";

export interface RunResult extends SendBatchResult {
  ok: true;
  /** How many rows were due (capped at `limit`). */
  due: number;
}

/**
 * Send every certificate whose scheduled time has passed, up to `limit`. Shared
 * by the hourly cron and the manual "send due batch" button. Idempotent: sent
 * rows are filtered out by `dueCertificates`, so re-running only retries what's
 * still scheduled or failed.
 */
export async function runDueCertificates(
  limit: number = MAX_PER_DAY,
): Promise<RunResult> {
  const due = await dueCertificates(new Date().toISOString(), limit);
  if (due.length === 0) {
    return { ok: true, due: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const signatory = await loadCertificateSignatory();
  const result = await sendCertificateBatch(due, signatory);
  return { ok: true, due: due.length, ...result };
}
