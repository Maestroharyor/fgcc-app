import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "@/lib/utils/env";

/**
 * Supabase client for React Server Components.
 *
 * Cookie writes throw inside RSCs (Next 16). We swallow that here so the same
 * client can be reused in Server Actions / Route Handlers via dynamic import
 * if needed - write attempts simply become no-ops in RSCs.
 *
 * If Supabase env vars are missing, returns a client wired to a non-resolving
 * placeholder URL. Queries through that client return a clean `error` object
 * which every downstream `db/*` helper already handles by returning an empty
 * result. This keeps the dev server bootable before backend is provisioned.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.invalid";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // RSC context - ignore. The proxy refreshes the session.
        }
      },
    },
  });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
