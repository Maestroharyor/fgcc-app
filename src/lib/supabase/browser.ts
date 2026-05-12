import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/utils/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error(
      "Supabase URL/Anon key missing - set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  cached = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
