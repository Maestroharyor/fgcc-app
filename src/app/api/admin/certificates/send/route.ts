import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import {
  type CertificateSendRow,
  sendCertificateBatch,
} from "@/lib/certificates/send-batch";
import { loadCertificateSignatory } from "@/lib/db/signatories";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const maxDuration = 60;

interface SendBody {
  reference_number?: string;
}

/**
 * Send (or resend) a single certificate by reference number. Bulk sending is
 * handled by the scheduler + daily cron so we never blow Resend's 100/day cap;
 * this endpoint is the one-off + retry path. Routes through the shared batch
 * sender so status/error columns stay consistent with scheduled sends.
 */
export async function POST(request: NextRequest) {
  await requireRole("superadmin");
  const body = (await request.json().catch(() => ({}))) as SendBody;

  if (!body.reference_number) {
    return NextResponse.json(
      { ok: false, error: "reference_number is required" },
      { status: 400 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(
      "id, full_name, email, reference_number, track_code, certificate_attempts",
    )
    .eq("reference_number", body.reference_number)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { ok: false, error: "Registration not found" },
      { status: 404 },
    );
  }

  const signatory = await loadCertificateSignatory();
  const result = await sendCertificateBatch(
    [data as CertificateSendRow],
    signatory,
    {
      throttleMs: 0,
    },
  );

  if (result.skipped > 0) {
    return NextResponse.json(
      { ok: false, error: "Recipient has no deliverable email address" },
      { status: 422 },
    );
  }

  return NextResponse.json({ ok: result.failed === 0, ...result });
}
