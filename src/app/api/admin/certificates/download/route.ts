import JSZip from "jszip";
import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { buildCertificate } from "@/lib/pdf/certificate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  await requireRole("admin");
  const ref = request.nextUrl.searchParams.get("ref");
  const supabase = await createSupabaseServerClient();

  if (ref) {
    const { data } = await supabase
      .from("registrations")
      .select(
        "full_name, reference_number, attended, tracks(name, facilitator_name)",
      )
      .eq("reference_number", ref)
      .maybeSingle();
    if (!data || !data.attended) {
      return NextResponse.json(
        { ok: false, error: "Not attended or not found" },
        { status: 404 },
      );
    }
    type TrackRow = { name: string; facilitator_name: string | null };
    const tracksValue = (data as { tracks: TrackRow | TrackRow[] | null })
      .tracks;
    const track = Array.isArray(tracksValue) ? tracksValue[0] : tracksValue;
    const pdf = await buildCertificate({
      fullName: data.full_name,
      referenceNumber: data.reference_number,
      trackName: track?.name ?? "SkillUp track",
      facilitatorName: track?.facilitator_name ?? null,
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
    .select(
      "full_name, reference_number, attended, tracks(name, facilitator_name)",
    )
    .eq("attended", true);

  const zip = new JSZip();
  for (const r of (attendees ?? []) as Array<{
    full_name: string;
    reference_number: string;
    tracks:
      | { name: string; facilitator_name: string | null }
      | { name: string; facilitator_name: string | null }[]
      | null;
  }>) {
    const track = Array.isArray(r.tracks) ? r.tracks[0] : r.tracks;
    const pdf = await buildCertificate({
      fullName: r.full_name,
      referenceNumber: r.reference_number,
      trackName: track?.name ?? "SkillUp track",
      facilitatorName: track?.facilitator_name ?? null,
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
