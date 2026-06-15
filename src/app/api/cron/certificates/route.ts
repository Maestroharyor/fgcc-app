import { type NextRequest, NextResponse } from "next/server";
import { runDueCertificates } from "@/lib/certificates/run";
import { env } from "@/lib/utils/env";

export const maxDuration = 300;

/**
 * Daily certificate send. Vercel Cron hits this with the CRON_SECRET bearer;
 * it sends everything scheduled for today (or earlier and not yet sent), capped
 * at the per-day limit. No-ops cleanly on days with nothing due.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (!env.CRON_SECRET || auth !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  const result = await runDueCertificates();
  return NextResponse.json(result);
}
