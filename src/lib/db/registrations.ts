import { cache } from "react";
import {
  eligibleForCertificate,
  isPlaceholderEmail,
  resolveDeliverEmail,
} from "@/lib/certificates/schedule";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CertificateStatus, DBRegistration } from "./types";

export async function getRegistrationByReference(
  ref: string,
): Promise<DBRegistration | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("reference_number", ref.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBRegistration;
}

export async function getRegistrationByEmail(
  email: string,
): Promise<DBRegistration | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("*")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as DBRegistration;
}

/**
 * Wrapped in React `cache()` so the registrant detail page can have a
 * Suspense child for the profile and another for the QR card without
 * issuing two identical queries.
 */
export const getRegistrationById = cache(
  async (id: string): Promise<DBRegistration | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("registrations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    return data as DBRegistration;
  },
);

export interface RegistrationsFilter {
  query?: string;
  /** 3-letter track code from `src/content/tracks.ts`. */
  trackCode?: string;
  type?: "self" | "others" | "offline";
  attended?: boolean;
  /** true = certificate_sent_at set, false = still null. */
  certificateSent?: boolean;
  /** Narrow to a single point in the scheduled-send pipeline. */
  certificateStatus?: CertificateStatus;
  page?: number;
  pageSize?: number;
  sortBy?: "created_at" | "full_name" | "reference_number";
  sortDir?: "asc" | "desc";
}

export interface RegistrationsPage {
  rows: DBRegistration[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listRegistrations(
  filter: RegistrationsFilter = {},
): Promise<RegistrationsPage> {
  const {
    query,
    trackCode,
    type,
    attended,
    certificateSent,
    certificateStatus,
    page = 1,
    pageSize = 50,
    sortBy = "created_at",
    sortDir = "desc",
  } = filter;

  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("registrations")
    .select("*", { count: "exact" })
    .order(sortBy, { ascending: sortDir === "asc" });

  if (query) {
    q = q.or(
      `full_name.ilike.%${query}%,email.ilike.%${query}%,reference_number.ilike.%${query}%`,
    );
  }
  if (trackCode) q = q.eq("track_code", trackCode.toUpperCase());
  if (type) q = q.eq("registered_via", type);
  if (attended !== undefined) q = q.eq("attended", attended);
  if (certificateSent !== undefined) {
    q = certificateSent
      ? q.not("certificate_sent_at", "is", null)
      : q.is("certificate_sent_at", null);
  }
  if (certificateStatus) q = q.eq("certificate_status", certificateStatus);

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);

  const { data, error, count } = await q;
  if (error) {
    console.warn("[db.registrations] listRegistrations:", error.message);
    return { rows: [], total: 0, page, pageSize };
  }
  return {
    rows: (data ?? []) as DBRegistration[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/** Minimal registrant shape for the event-day attendance board. */
export interface AttendanceEntry {
  id: string;
  reference_number: string;
  full_name: string;
  track_code: string;
  attended: boolean;
  attended_at: string | null;
  /** One ISO timestamp per Lagos day checked in. Null on pre-005 rows. */
  attendance_log: string[] | null;
}

/**
 * Every registrant with just the columns the attendance board needs, sorted by
 * name. `cache()`-wrapped so the check-in page's tally and board (two Suspense
 * children in one request) share a single round-trip. All counts (present vs
 * absent, per-track, today vs cumulative) are derived from this array in JS.
 */
export const getAttendanceBoard = cache(
  async (): Promise<AttendanceEntry[]> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("registrations")
      .select(
        "id, reference_number, full_name, track_code, attended, attended_at, attendance_log",
      )
      .order("full_name", { ascending: true });
    if (error) {
      console.warn("[db.registrations] getAttendanceBoard:", error.message);
      return [];
    }
    return (data ?? []) as AttendanceEntry[];
  },
);

export async function countAttended(): Promise<number> {
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("registrations")
    .select("*", { count: "exact", head: true })
    .eq("attended", true);
  return count ?? 0;
}

// ── Certificate scheduling ────────────────────────────────────────────────

/**
 * Pull the submitter email out of an embedded `batches` relation. PostgREST
 * types a to-one embed as an array in some setups and a single object in
 * others, so accept both shapes.
 */
function submitterEmailFrom(
  batches:
    | { submitter_email: string | null }
    | { submitter_email: string | null }[]
    | null
    | undefined,
): string | null {
  if (!batches) return null;
  const row = Array.isArray(batches) ? batches[0] : batches;
  return row?.submitter_email ?? null;
}

/** A recipient shown in the scheduler preview and the certificate table. */
export interface CertificateRecipient {
  id: string;
  reference_number: string;
  full_name: string;
  email: string;
  track_code: string;
  certificate_status: CertificateStatus;
  certificate_scheduled_for: string | null;
  certificate_sent_at: string | null;
  certificate_error: string | null;
  attendance_log: string[] | null;
  attended_at: string | null;
  /** Registrar's email (batch submitter), if this person was registered by someone else. */
  submitter_email: string | null;
  /** Where the certificate would actually be emailed (own email or registrar). */
  deliver_email: string | null;
  /** True when delivery falls back to the registrar (own email is a placeholder). */
  via_registrar: boolean;
}

const RECIPIENT_COLS =
  "id, reference_number, full_name, email, track_code, attendance_log, attended_at, certificate_status, certificate_scheduled_for, certificate_sent_at, certificate_error, batch_id, batches(submitter_email)";

/** Raw row shape with the nested batch relation before flattening. */
type RawRecipientRow = Omit<
  CertificateRecipient,
  "submitter_email" | "deliver_email" | "via_registrar"
> & {
  batch_id: string | null;
  batches:
    | { submitter_email: string | null }
    | { submitter_email: string | null }[]
    | null;
};

export interface CertificateAudience {
  /** Email-eligible attendees (own email, or registrar when opted in), not yet sent. */
  recipients: CertificateRecipient[];
  eligibleCount: number;
  /** Of the eligible, how many are routed to the registrar (own email is a placeholder). */
  viaRegistrar: number;
  /** Attendees still unreachable: placeholder email with no usable registrar. */
  noEmail: number;
  /** Attendees already sent a certificate. */
  alreadySent: number;
}

/**
 * The certificate audience for an optional track: everyone who attended (any
 * day), split into email-eligible recipients vs the still-no-email and
 * already-sent tallies. When `includeRegistrar` is set, no-email participants
 * who were registered by someone else are routed to that registrar's address.
 * One fetch shared by the preview and schedule routes.
 */
export async function getCertificateAudience(
  filter: { trackCode?: string | null; includeRegistrar?: boolean } = {},
): Promise<CertificateAudience> {
  const empty: CertificateAudience = {
    recipients: [],
    eligibleCount: 0,
    viaRegistrar: 0,
    noEmail: 0,
    alreadySent: 0,
  };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(RECIPIENT_COLS)
    .eq("attended", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.warn("[db.registrations] getCertificateAudience:", error.message);
    return empty;
  }

  const includeRegistrar = filter.includeRegistrar ?? false;
  const code = filter.trackCode?.toUpperCase();
  const attended: CertificateRecipient[] = (
    (data ?? []) as unknown as RawRecipientRow[]
  )
    .filter((r) => !code || r.track_code.toUpperCase() === code)
    .map(({ batch_id: _batchId, batches, ...rest }) => {
      const submitter_email = submitterEmailFrom(batches);
      return {
        ...rest,
        submitter_email,
        deliver_email: resolveDeliverEmail(
          { email: rest.email, submitter_email },
          includeRegistrar,
        ),
        via_registrar: isPlaceholderEmail(rest.email),
      };
    });

  const recipients = eligibleForCertificate(attended, {
    trackCode: filter.trackCode,
    includeRegistrar,
  });
  const alreadySent = attended.filter(
    (r) => r.certificate_status === "sent" || r.certificate_sent_at,
  ).length;
  // Still-no-email: placeholder rows that did not resolve to a deliverable address.
  const noEmail = attended.filter(
    (r) => isPlaceholderEmail(r.email) && r.deliver_email === null,
  ).length;

  return {
    recipients,
    eligibleCount: recipients.length,
    viaRegistrar: recipients.filter((r) => r.via_registrar).length,
    noEmail,
    alreadySent,
  };
}

export interface CertificateScheduleDay {
  dateKey: string;
  scheduled: number;
  sent: number;
  failed: number;
  total: number;
}

/** Scheduled rows bucketed by send day, with per-status counts for the board. */
export async function getCertificateSchedule(): Promise<
  CertificateScheduleDay[]
> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("certificate_scheduled_for, certificate_status")
    .not("certificate_scheduled_for", "is", null)
    .order("certificate_scheduled_for", { ascending: true });
  if (error) {
    console.warn("[db.registrations] getCertificateSchedule:", error.message);
    return [];
  }
  const byDay = new Map<string, CertificateScheduleDay>();
  for (const row of (data ?? []) as Array<{
    certificate_scheduled_for: string;
    certificate_status: CertificateStatus;
  }>) {
    const key = row.certificate_scheduled_for;
    let day = byDay.get(key);
    if (!day) {
      day = { dateKey: key, scheduled: 0, sent: 0, failed: 0, total: 0 };
      byDay.set(key, day);
    }
    day.total += 1;
    if (row.certificate_status === "sent") day.sent += 1;
    else if (row.certificate_status === "failed") day.failed += 1;
    else if (row.certificate_status === "scheduled") day.scheduled += 1;
  }
  return [...byDay.values()];
}

export interface CertificateStatusCounts {
  none: number;
  scheduled: number;
  sent: number;
  failed: number;
  /** Attendees with no email (placeholder) - print-only, never in the email pipeline. */
  noEmail: number;
}

/**
 * Status totals across attendees for the email pipeline. Status-first: a row
 * that's already in the pipeline (scheduled/sent/failed) counts under that
 * status regardless of email, so a no-email participant routed to a registrar
 * moves out of "No email" once queued. Only not-yet-queued placeholder rows
 * count as "No email".
 */
export async function countCertificateStatuses(): Promise<CertificateStatusCounts> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("certificate_status, email")
    .eq("attended", true);
  const counts: CertificateStatusCounts = {
    none: 0,
    scheduled: 0,
    sent: 0,
    failed: 0,
    noEmail: 0,
  };
  if (error) {
    console.warn("[db.registrations] countCertificateStatuses:", error.message);
    return counts;
  }
  for (const row of (data ?? []) as Array<{
    certificate_status: CertificateStatus;
    email: string;
  }>) {
    if (row.certificate_status === "none") {
      if (isPlaceholderEmail(row.email)) counts.noEmail += 1;
      else counts.none += 1;
    } else {
      counts[row.certificate_status] += 1;
    }
  }
  return counts;
}

/** Row shape consumed by the batch sender. */
export interface DueCertificate {
  id: string;
  full_name: string;
  /** Resolved delivery address: own email, or the registrar's for no-email rows. */
  email: string;
  reference_number: string;
  track_code: string;
  certificate_attempts: number;
  /** True when delivery is routed to the registrar (own email is a placeholder). */
  via_registrar: boolean;
}

type DueRow = {
  id: string;
  full_name: string;
  email: string;
  reference_number: string;
  track_code: string;
  certificate_attempts: number;
  batch_id: string | null;
  batches:
    | { submitter_email: string | null }
    | { submitter_email: string | null }[]
    | null;
};

/**
 * Rows owed a certificate on or before `dateKey`: scheduled-or-failed, never
 * sent. Uses the service-role client so the daily cron (no user session) can
 * read them. Capped at `limit` to respect the daily send budget. Placeholder
 * rows are only ever scheduled when the admin opted into registrar routing, so
 * we resolve their delivery address to the registrar here; if none resolves,
 * the placeholder address falls through and the sender skips it.
 */
export async function dueCertificates(
  dateKey: string,
  limit: number,
): Promise<DueCertificate[]> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, full_name, email, reference_number, track_code, certificate_attempts, batch_id, batches(submitter_email)",
    )
    .lte("certificate_scheduled_for", dateKey)
    .in("certificate_status", ["scheduled", "failed"])
    .is("certificate_sent_at", null)
    .order("certificate_scheduled_for", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) {
    console.warn("[db.registrations] dueCertificates:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as DueRow[]).map(
    ({ batch_id: _b, batches, ...r }) => {
      const submitter_email = submitterEmailFrom(batches);
      return {
        id: r.id,
        full_name: r.full_name,
        email:
          resolveDeliverEmail({ email: r.email, submitter_email }, true) ??
          r.email,
        reference_number: r.reference_number,
        track_code: r.track_code,
        certificate_attempts: r.certificate_attempts,
        via_registrar: isPlaceholderEmail(r.email),
      };
    },
  );
}
