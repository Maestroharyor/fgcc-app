import JSZip from "jszip";
import { type NextRequest, NextResponse } from "next/server";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { buildCertificate } from "@/lib/pdf/certificate";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function trackMeta(code: string | null | undefined) {
  return { name: TRACKS.find((x) => x.code === code)?.name ?? "SkillUp track" };
}

export async function GET(request: NextRequest) {
  const ref = request.nextUrl.searchParams.get("ref");
  // Preview lets the superadmin inspect a certificate before attendance is
  // marked; it renders inline instead of downloading.
  const preview = request.nextUrl.searchParams.get("preview") === "1";
  await requireRole(preview ? "superadmin" : "admin");
  const supabase = await createSupabaseServerClient();

  if (ref) {
    const { data } = await supabase
      .from("registrations")
      .select("full_name, reference_number, attended, track_code")
      .eq("reference_number", ref)
      .maybeSingle();
    if (!data || (!data.attended && !preview)) {
      return NextResponse.json(
        { ok: false, error: "Not attended or not found" },
        { status: 404 },
      );
    }
    const signatory = await loadCertificateSignatory();
    const pdf = await buildCertificate({
      fullName: data.full_name,
      referenceNumber: data.reference_number,
      trackName: trackMeta(data.track_code).name,
      signatory,
    });
    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="SkillUp-${data.reference_number}.pdf"`,
      },
    });
  }

  // ZIP everyone attended
  const { data: attendees, error } = await supabase
    .from("registrations")
    .select("full_name, reference_number, attended, track_code")
    .eq("attended", true);

  if (error) {
    return NextResponse.json(
      { ok: false, error: "Could not load attendees" },
      { status: 500 },
    );
  }

  const rows = (attendees ?? []) as Array<{
    full_name: string;
    reference_number: string;
    track_code: string;
  }>;

  // Without this guard an empty result silently produces a valid-but-useless
  // ~22-byte empty archive. Surface a clear message instead.
  if (rows.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "No attended registrations yet. Mark attendance first.",
      },
      { status: 404 },
    );
  }

  const signatory = await loadCertificateSignatory();
  const zip = new JSZip();
  for (const r of rows) {
    const pdf = await buildCertificate({
      fullName: r.full_name,
      referenceNumber: r.reference_number,
      trackName: trackMeta(r.track_code).name,
      signatory,
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
