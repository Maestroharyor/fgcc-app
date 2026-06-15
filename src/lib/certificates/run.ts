import { dueCertificates } from "@/lib/db/registrations";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { attendanceDayKey } from "@/lib/utils/date";
import { MAX_PER_DAY } from "./schedule";
import { type SendBatchResult, sendCertificateBatch } from "./send-batch";

export interface RunResult extends SendBatchResult {
  ok: true;
  /** How many rows were due (capped at `limit`). */
  due: number;
}

/**
 * Send every certificate due on or before today (Lagos), up to `limit`. Shared
 * by the daily cron and the manual "send today's batch" button. Idempotent:
 * sent rows are filtered out by `dueCertificates`, so re-running only retries
 * what's still scheduled or failed.
 */
export async function runDueCertificates(
  limit: number = MAX_PER_DAY,
): Promise<RunResult> {
  const todayKey = attendanceDayKey();
  const due = await dueCertificates(todayKey, limit);
  if (due.length === 0) {
    return { ok: true, due: 0, sent: 0, failed: 0, skipped: 0 };
  }
  const signatory = await loadCertificateSignatory();
  const result = await sendCertificateBatch(due, signatory);
  return { ok: true, due: due.length, ...result };
}
