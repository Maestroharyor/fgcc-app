import { addDays } from "date-fns";
import type { CertificateStatus } from "@/lib/db/types";
import { attendanceDayKey } from "@/lib/utils/date";

/** Resend's free-plan ceiling is 100 emails/day; default below it for headroom. */
export const DEFAULT_PER_DAY = 90;
export const MAX_PER_DAY = 95;

const PLACEHOLDER_DOMAIN = "@placeholder.skillup";

/** Offline walk-ins with no address get a synthesised `@placeholder.skillup` email. */
export const isPlaceholderEmail = (email: string | null | undefined): boolean =>
  Boolean(email?.endsWith(PLACEHOLDER_DOMAIN));

const isPlaceholder = isPlaceholderEmail;

/** Minimal registrant shape needed to decide certificate eligibility. */
export interface CertificateCandidate {
  id: string;
  email: string;
  track_code: string;
  certificate_status?: CertificateStatus | null;
  certificate_sent_at?: string | null;
  /** Registrar's email (from the batch), if this person was registered by someone else. */
  submitter_email?: string | null;
}

export interface EligibilityFilter {
  /** Optional 3-letter track code to narrow the audience. */
  trackCode?: string | null;
  /** Route no-email participants to whoever registered them (the batch submitter). */
  includeRegistrar?: boolean;
}

/**
 * Where this person's certificate can actually be emailed, or `null` if nowhere:
 *  - their own real email, when present;
 *  - else, when `includeRegistrar`, the registrar's real email (batch submitter);
 *  - else null (offline walk-in with no address and no registrar).
 */
export function resolveDeliverEmail(
  c: Pick<CertificateCandidate, "email" | "submitter_email">,
  includeRegistrar = false,
): string | null {
  if (!isPlaceholder(c.email)) return c.email;
  if (
    includeRegistrar &&
    c.submitter_email &&
    !isPlaceholder(c.submitter_email)
  )
    return c.submitter_email;
  return null;
}

/**
 * Anyone who attended (the caller already filters `attended = true`), can be
 * emailed (own address, or the registrar's when `includeRegistrar`), and hasn't
 * been sent one yet. Optionally narrowed to a track. Re-running never
 * double-queues since already-sent rows are dropped.
 */
export function eligibleForCertificate<T extends CertificateCandidate>(
  rows: T[],
  { trackCode, includeRegistrar }: EligibilityFilter = {},
): T[] {
  const code = trackCode?.toUpperCase();
  return rows.filter((r) => {
    if (r.certificate_status === "sent" || r.certificate_sent_at) return false;
    if (code && r.track_code.toUpperCase() !== code) return false;
    return resolveDeliverEmail(r, includeRegistrar) !== null;
  });
}

/** The Lagos day key `offset` days after `startDateKey`. */
export function dayKeyAfter(startDateKey: string, offset: number): string {
  // Anchor at Lagos noon so adding whole days never trips the midnight boundary.
  const anchor = new Date(`${startDateKey}T12:00:00+01:00`);
  return attendanceDayKey(addDays(anchor, offset));
}

export interface DayPlan {
  dateKey: string;
  count: number;
}

/**
 * How `count` recipients split into per-day batches starting `startDateKey`.
 * Pure - used for the UI preview ("50 on Jun 16, 23 on Jun 17").
 */
export function planSchedule(
  count: number,
  perDay: number,
  startDateKey: string,
): DayPlan[] {
  if (count <= 0 || perDay <= 0) return [];
  const days: DayPlan[] = [];
  let remaining = count;
  let offset = 0;
  while (remaining > 0) {
    const take = Math.min(perDay, remaining);
    days.push({ dateKey: dayKeyAfter(startDateKey, offset), count: take });
    remaining -= take;
    offset += 1;
  }
  return days;
}

export interface DayAssignment {
  dateKey: string;
  ids: string[];
}

/**
 * Map ordered recipient ids onto consecutive send days. The route applies one
 * bulk update per returned group. Order in = order scheduled, so the result is
 * deterministic for a given input.
 */
export function assignScheduleDays(
  ids: string[],
  perDay: number,
  startDateKey: string,
): DayAssignment[] {
  if (ids.length === 0 || perDay <= 0) return [];
  const groups: DayAssignment[] = [];
  for (let i = 0, offset = 0; i < ids.length; i += perDay, offset += 1) {
    groups.push({
      dateKey: dayKeyAfter(startDateKey, offset),
      ids: ids.slice(i, i + perDay),
    });
  }
  return groups;
}
