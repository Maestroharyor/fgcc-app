import JSZip from "jszip";
import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { buildCertificate } from "@/lib/pdf/certificate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function trackMeta(code: string | null | undefined) {
  const t = TRACKS.find((x) => x.code === code);
  return {
    name: t?.name ?? "SkillUp track",
    facilitator: t?.facilitator ?? null,
  };
}

export async function GET(request: NextRequest) {
  await requireRole("admin");
  const ref = request.nextUrl.searchParams.get("ref");
  const supabase = await createSupabaseServerClient();

  if (ref) {
    const { data } = await supabase
      .from("registrations")
      .select("full_name, reference_number, attended, track_code")
      .eq("reference_number", ref)
      .maybeSingle();
    if (!data || !data.attended) {
      return NextResponse.json(
        { ok: false, error: "Not attended or not found" },
        { status: 404 },
      );
    }
    const track = trackMeta(data.track_code);
    const pdf = await buildCertificate({
      fullName: data.full_name,
      referenceNumber: data.reference_number,
      trackName: track.name,
      facilitatorName: track.facilitator,
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="SkillUp-${data.reference_number}.pdf"`,
      },
    });
  }

  // ZIP everyone attended
  const { data: attendees } = await supabase
    .from("registrations")
    .select("full_name, reference_number, attended, track_code")
    .eq("attended", true);

  const zip = new JSZip();
  for (const r of (attendees ?? []) as Array<{
    full_name: string;
    reference_number: string;
    track_code: string;
  }>) {
    const track = trackMeta(r.track_code);
    const pdf = await buildCertificate({
      fullName: r.full_name,
      referenceNumber: r.reference_number,
      trackName: track.name,
      facilitatorName: track.facilitator,
    });
    zip.file(`SkillUp-${r.reference_number}.pdf`, pdf);
  }
  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return new NextResponse(new Uint8Array(buf), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="skillup-certificates.zip"',
    },
  });
}
