import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { sendCertificateEmail } from "@/lib/email/send";
import { buildCertificate } from "@/lib/pdf/certificate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function trackMeta(code: string | null | undefined) {
  return { name: TRACKS.find((x) => x.code === code)?.name ?? "SkillUp track" };
}

interface SendBody {
  reference_number?: string;
  all?: boolean;
}

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

export async function POST(request: NextRequest) {
  await requireRole("superadmin");
  const body = (await request.json().catch(() => ({}))) as SendBody;

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("registrations")
    .select(
      "id, full_name, email, reference_number, attended, certificate_sent_at, track_code",
    )
    .eq("attended", true);
  if (body.reference_number && !body.all) {
    query = query.eq("reference_number", body.reference_number);
  }
  const { data: attendees, error } = await query;
  if (error)
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  if (!attendees || attendees.length === 0) {
    return NextResponse.json(
      { ok: false, error: "No matching attendees" },
      { status: 404 },
    );
  }

  const signatory = await loadCertificateSignatory();
  let sent = 0;
  let skipped = 0;
  for (const r of attendees as Array<{
    id: string;
    full_name: string;
    email: string;
    reference_number: string;
    track_code: string;
  }>) {
    if (r.email.endsWith("@placeholder.skillup")) {
      skipped++;
      continue;
    }
    const track = trackMeta(r.track_code);
    const pdf = await buildCertificate({
      fullName: r.full_name,
      referenceNumber: r.reference_number,
      trackName: track.name,
      signatory,
    });
    const result = await sendCertificateEmail(
      r.email,
      {
        firstName: firstName(r.full_name),
        trackName: track.name,
      },
      pdf,
    );
    if (result.ok) {
      sent++;
      await supabase
        .from("registrations")
        .update({ certificate_sent_at: new Date().toISOString() })
        .eq("id", r.id);
    } else {
      skipped++;
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
