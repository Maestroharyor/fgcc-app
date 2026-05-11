import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/utils/env";

/**
 * Supabase client for src/proxy.ts. Returns the supabase instance plus a
 * NextResponse that already has refreshed auth cookies attached — callers
 * should mutate that response (or return it) rather than constructing a new
 * NextResponse.
 */
export function createSupabaseProxyClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.invalid";
  const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  return { supabase, response };
}
