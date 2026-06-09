import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import {
  sendFeedbackRequestEmail,
  sendReminder1DayEmail,
  sendReminder3DayEmail,
} from "@/lib/email/send";
import { sendBulkSMS } from "@/lib/sms/termii";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/utils/env";

function trackMeta(code: string | null | undefined) {
  const t = TRACKS.find((x) => x.code === code);
  return {
    name: t?.name ?? "your track",
    facilitator: t?.facilitator ?? null,
  };
}

type Kind = "3day" | "1day" | "feedback";

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

export async function GET(request: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` when the env var is set.
  const auth = request.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const kind = (request.nextUrl.searchParams.get("kind") ?? "3day") as Kind;
  const supabase = createSupabaseAdminClient();

  const sentColumn =
    kind === "3day"
      ? "reminder_3day_sent_at"
      : kind === "1day"
        ? "reminder_1day_sent_at"
        : "feedback_request_sent_at";

  const query = supabase
    .from("registrations")
    .select(
      "id, reference_number, full_name, email, phone, attended, track_code",
    )
    .is(sentColumn, null);

  if (kind === "feedback") {
    query.eq("attended", true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<{
    id: string;
    reference_number: string;
    full_name: string;
    email: string;
    phone: string;
    attended: boolean;
    track_code: string;
  }>;

  const skipPlaceholder = (email: string) =>
    !email || email.endsWith("@placeholder.skillup");

  let emailSent = 0;
  let smsSent = 0;
  const smsRecipients: Array<{ to: string; message: string }> = [];

  for (const r of rows) {
    if (skipPlaceholder(r.email)) continue;
    const track = trackMeta(r.track_code);
    if (kind === "3day") {
      await sendReminder3DayEmail(r.email, {
        firstName: firstName(r.full_name),
        trackName: track.name,
        facilitatorName: track.facilitator,
      });
      emailSent++;
    } else if (kind === "1day") {
      await sendReminder1DayEmail(r.email, {
        firstName: firstName(r.full_name),
        trackName: track.name,
      });
      emailSent++;
      smsRecipients.push({
        to: r.phone,
        message: `SkillUp 1.0 starts tomorrow 9AM at Cement Missionary District Headquarters. Bring this ref: ${r.reference_number}. See you there!`,
      });
    } else if (kind === "feedback") {
      await sendFeedbackRequestEmail(r.email, {
        firstName: firstName(r.full_name),
        trackName: track.name,
        feedbackUrl: `${env.NEXT_PUBLIC_SITE_URL}/skillup/feedback?ref=${r.reference_number}`,
      });
      emailSent++;
    }

    await supabase
      .from("registrations")
      // Cast to `never` while DB types are hand-rolled - running
      // `supabase gen types` will narrow this naturally.
      .update({ [sentColumn]: new Date().toISOString() } as never)
      .eq("id", r.id);
  }

  if (smsRecipients.length > 0) {
    const results = await sendBulkSMS(smsRecipients);
    smsSent = results.filter((r) => r.ok).length;
  }

  return NextResponse.json({
    ok: true,
    kind,
    processed: rows.length,
    emailSent,
    smsSent,
  });
}
