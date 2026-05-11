import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";

/**
 * Certificates are generated on demand by the download + send endpoints, so
 * this route is intentionally a no-op stub. It exists to keep the URL pattern
 * symmetrical and to give superadmins a future hook for pre-generation /
 * bucket storage if we add Supabase Storage later.
 */
export async function POST() {
  await requireRole("superadmin");
  return NextResponse.json({ ok: true, message: "Generated on demand." });
}
