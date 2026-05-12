import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/utils/env";

/**
 * Supabase client for Route Handlers. Can both read and write cookies.
 * Falls back to a placeholder URL when env is missing so the route compiles -
 * queries through it will surface as `{ error }` for downstream handlers.
 */
export async function createSupabaseRouteClient() {
  const cookieStore = await cookies();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.invalid";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options);
        }
      },
    },
  });
}
