import { createClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/utils/env";

/**
 * Service-role Supabase client. Server-only. Bypasses RLS - use sparingly
 * (admin invitations, cron jobs, scripted ops). NEVER import from a Client
 * Component or surface its key to the browser.
 */
let cached: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;
  cached = createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return cached;
}
