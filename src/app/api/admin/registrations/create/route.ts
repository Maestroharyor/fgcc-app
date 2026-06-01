import { revalidatePath } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { getRegistrationByEmail } from "@/lib/db/registrations";
import {
  sendAdminNotificationEmail,
  sendConfirmationEmail,
} from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";
import { AdminBatchRegistrationSchema } from "@/lib/validation/schemas";

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

interface RowResult {
  fullName: string;
  trackName: string | null;
  status: "ok" | "duplicate" | "error";
  referenceNumber?: string;
  message?: string;
}

/**
 * Admin-initiated (offline) batch registration. Used by the dashboard's
 * "Add registration" form to enter one or more walk-ins. Each row is processed
 * independently: there is no capacity gate (an admin may add to a full track on
 * purpose), the email is optional, and rows are stamped registered_via =
 * 'offline'. Returns a per-row result array so the UI can show what landed.
 */
export async function POST(request: NextRequest) {
  await requireRole("admin");

  const payload = await request.json().catch(() => ({}));

  let parsed: ReturnType<typeof AdminBatchRegistrationSchema.parse>;
  try {
    parsed = AdminBatchRegistrationSchema.parse(payload);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid details" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const results: RowResult[] = [];
  // Emails captured earlier in THIS request - the DB dedupe below can't see a
  // not-yet-inserted row, so a repeated email within one batch is caught here.
  const seenEmails = new Set<string>();
  const okRegistrants: Array<{
    fullName: string;
    referenceNumber: string;
    trackName: string;
    email: string;
    phone: string;
    church: string | null;
  }> = [];
  const confirmations: Array<Promise<unknown>> = [];

  for (const r of parsed.registrants) {
    const track = trackByCode(r.track_code);
    if (!track) {
      results.push({
        fullName: r.full_name,
        trackName: null,
        status: "error",
        message: "track-not-found",
      });
      continue;
    }

    // email is UNIQUE on registrations. Dedupe up front when a real address was
    // captured and hand back the existing reference (mirrors registerSelfAction).
    if (r.email) {
      if (seenEmails.has(r.email)) {
        results.push({
          fullName: r.full_name,
          trackName: track.name,
          status: "duplicate",
          message: "repeated in this batch",
        });
        continue;
      }
      const existing = await getRegistrationByEmail(r.email);
      if (existing) {
        results.push({
          fullName: r.full_name,
          trackName: track.name,
          status: "duplicate",
          referenceNumber: existing.reference_number,
        });
        continue;
      }
      seenEmails.add(r.email);
    }

    // Synthesise a unique placeholder email when none was provided - the DB
    // requires a unique, non-null email per row.
    const emailToUse =
      r.email ??
      `noemail+${track.code.toLowerCase()}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}@placeholder.skillup`;

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
        registered_via: "offline",
      })
      .select("reference_number")
      .single();

    if (error || !inserted) {
      results.push({
        fullName: r.full_name,
        trackName: track.name,
        // 23505 = unique violation; covers the race the pre-check above missed.
        status:
          (error as { code?: string } | null)?.code === "23505"
            ? "duplicate"
            : "error",
        message:
          (error as { code?: string } | null)?.code === "23505"
            ? undefined
            : (error?.message ?? "Could not save registration"),
      });
      continue;
    }

    const referenceNumber = inserted.reference_number as string;
    results.push({
      fullName: r.full_name,
      trackName: track.name,
      status: "ok",
      referenceNumber,
    });
    okRegistrants.push({
      fullName: r.full_name,
      referenceNumber,
      trackName: track.name,
      email: r.email ?? "",
      phone: r.phone,
      church: r.church ?? null,
    });

    if (r.email) {
      confirmations.push(
        sendConfirmationEmail(r.email, {
          firstName: firstName(r.full_name),
          referenceNumber,
          trackName: track.name,
          facilitatorName: track.facilitator,
          whatsappUrl: track.whatsappUrl ?? env.NEXT_PUBLIC_SITE_URL,
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
        }),
      );
    }
  }

  // Comms are awaited (allSettled) so a send failure can't reject the request.
  // One admin notification lists everyone that landed; per-registrant
  // confirmations go to those who gave a real email.
  if (okRegistrants.length > 0) {
    confirmations.push(
      sendAdminNotificationEmail({
        type: "offline",
        registrants: okRegistrants,
        dashboardUrl: `${env.NEXT_PUBLIC_SITE_URL}/admin/registrations`,
      }),
    );
  }
  await Promise.allSettled(confirmations);

  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/registrations");

  return NextResponse.json({ ok: true, results });
}
