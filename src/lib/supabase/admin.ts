import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/utils/env";

/**
 * Service-role Supabase client. Server-only. Bypasses RLS - use sparingly
 * (admin invitations, cron jobs, scripted ops). NEVER import from a Client
 * Component or surface its key to the browser.
 *
 * Typed loosely (`<any>`) because we don't auto-generate Database types yet -
 * `supabase gen types typescript` would replace `any` with the real schema.
 */
// biome-ignore lint/suspicious/noExplicitAny: see comment above
let cached: SupabaseClient<any> | null = null;

export function createSupabaseAdminClient() {
  if (cached) return cached;
  // biome-ignore lint/suspicious/noExplicitAny: see comment above
  cached = createClient<any>(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SECRET_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  );
  return cached;
}
