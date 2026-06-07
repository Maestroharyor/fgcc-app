import { type NextRequest, NextResponse } from "next/server";
import { trackByCode } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { sendWhatsAppReminderEmail } from "@/lib/email/send";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { env } from "@/lib/utils/env";

interface ReminderBody {
  id?: string;
  all?: boolean;
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/** Offline rows get a synthesised address; those can't receive the reminder. */
function isDeliverable(row: { email: string; track_code: string }) {
  return (
    !row.email.endsWith("@placeholder.skillup") &&
    Boolean(trackByCode(row.track_code)?.whatsappUrl)
  );
}

/**
 * Counts for the bulk confirm modal: how many registrants would receive the
 * reminder and how many are excluded (placeholder email / unknown track).
 */
export async function GET() {
  await requireRole("admin");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select("email, track_code");
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<{ email: string; track_code: string }>;
  const recipients = rows.filter(isDeliverable).length;
  return NextResponse.json({
    ok: true,
    recipients,
    excluded: rows.length - recipients,
  });
}

/**
 * Re-send the "join your track WhatsApp group" email. Body is either
 * `{ id }` for one registrant or `{ all: true }` for every registrant with a
 * real email. Rows whose track has no WhatsApp link are skipped.
 */
export async function POST(request: NextRequest) {
  await requireRole("admin");
  const body = (await request.json().catch(() => ({}))) as ReminderBody;

  if (!body.id && !body.all) {
    return NextResponse.json(
      { ok: false, error: "Pass an id or all:true" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("registrations")
    .select("id, full_name, email, reference_number, track_code");
  if (body.id && !body.all) {
    query = query.eq("id", body.id);
  }
  const { data: rows, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  if (!rows || rows.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No matching registrations" },
      { status: 404 },
    );
  }

  let sent = 0;
  let skipped = 0;
  for (const r of rows as Array<{
    full_name: string;
    email: string;
    reference_number: string;
    track_code: string;
  }>) {
    const track = trackByCode(r.track_code);
    if (!isDeliverable(r) || !track) {
      skipped++;
      continue;
    }
    const result = await sendWhatsAppReminderEmail(r.email, {
      firstName: firstName(r.full_name),
      referenceNumber: r.reference_number,
      trackName: track.name,
      whatsappUrl: track.whatsappUrl,
      siteUrl: env.NEXT_PUBLIC_SITE_URL,
    });
    if (result.ok) sent++;
    else skipped++;
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
