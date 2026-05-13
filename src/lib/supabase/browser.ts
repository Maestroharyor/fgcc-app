import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/utils/env";

let cached: ReturnType<typeof createBrowserClient> | null = null;

export function createSupabaseBrowserClient() {
  if (cached) return cached;
  if (
    !env.NEXT_PUBLIC_SUPABASE_URL ||
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    throw new Error(
      "Supabase URL/Publishable key missing - set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  cached = createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  return cached;
}
