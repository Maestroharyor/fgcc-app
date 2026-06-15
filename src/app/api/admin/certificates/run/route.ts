import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { runDueCertificates } from "@/lib/certificates/run";

// Sending is serial + rate-limited (~0.6s/email), so a full daily batch can run
// close to a minute. Give the function generous headroom.
export const maxDuration = 300;

/** Manual "send today's batch now" - same processing the daily cron runs. */
export async function POST() {
  await requireRole("superadmin");
  const result = await runDueCertificates();
  return NextResponse.json(result);
}
