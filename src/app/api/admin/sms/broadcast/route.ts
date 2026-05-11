import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { sendBulkSMS } from "@/lib/sms/termii";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { BroadcastSmsSchema } from "@/lib/validation/schemas";

async function audienceQuery(
  audience: "all" | "track" | "attended",
  trackId?: string,
) {
  const supabase = await createSupabaseServerClient();
  let q = supabase.from("registrations").select("phone");
  if (audience === "track" && trackId) q = q.eq("track_id", trackId);
  if (audience === "attended") q = q.eq("attended", true);
  const { data } = await q;
  return (data ?? [])
    .map((r) => (r as { phone: string }).phone)
    .filter((p) => p && p.length > 5);
}

export async function GET(request: NextRequest) {
  await requireRole("superadmin");
  const sp = request.nextUrl.searchParams;
  const audience = (sp.get("audience") ?? "all") as
    | "all"
    | "track"
    | "attended";
  const trackId = sp.get("track_id") ?? undefined;
  const phones = await audienceQuery(audience, trackId);
  return NextResponse.json({ recipients: phones.length });
}

export async function POST(request: NextRequest) {
  await requireRole("superadmin");
  const payload = await request.json().catch(() => ({}));
  let parsed: {
    audience: "all" | "track" | "attended";
    track_id?: string;
    message: string;
  };
  try {
    parsed = BroadcastSmsSchema.parse(payload);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Invalid payload" },
      { status: 400 },
    );
  }

  const phones = await audienceQuery(parsed.audience, parsed.track_id);
  if (phones.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No recipients" },
      { status: 400 },
    );
  }

  const results = await sendBulkSMS(
    phones.map((to) => ({ to, message: parsed.message })),
  );
  const sent = results.filter((r) => r.ok).length;
  const failed = results.length - sent;
  return NextResponse.json({ ok: true, sent, failed });
}
