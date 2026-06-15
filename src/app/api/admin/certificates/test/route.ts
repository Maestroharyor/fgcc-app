import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TRACKS } from "@/content/tracks";
import { requireRole } from "@/lib/auth/require-role";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { sendCertificateEmail } from "@/lib/email/send";
import { buildCertificate } from "@/lib/pdf/certificate";

export const maxDuration = 60;

const TestSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().min(1).optional(),
  trackName: z.string().trim().min(1).optional(),
});

function firstName(full: string) {
  return full.trim().split(/\s+/)[0] ?? full;
}

/**
 * Send a sample certificate email (real template + a generated sample PDF) to a
 * chosen address so admins can preview exactly what attendees receive. Uses
 * placeholder name/track/reference - nothing is read from or written to the DB.
 */
export async function POST(request: NextRequest) {
  await requireRole("superadmin");
  const parsed = TestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const fullName = parsed.data.name ?? "Sample Recipient";
  const trackName = parsed.data.trackName ?? TRACKS[0]?.name ?? "SkillUp track";

  const signatory = await loadCertificateSignatory();
  const pdf = await buildCertificate({
    fullName,
    referenceNumber: "SKU-XXX-000",
    trackName,
    signatory,
  });

  const result = await sendCertificateEmail(
    parsed.data.email,
    { firstName: firstName(fullName), trackName },
    pdf,
  );

  return NextResponse.json(
    result.ok ? { ok: true } : { ok: false, error: result.error },
    { status: result.ok ? 200 : 502 },
  );
}
