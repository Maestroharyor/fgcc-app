import { beforeEach, describe, expect, it, vi } from "vitest";

const createClientMock = vi.fn(() => ({ kind: "service-role" }));

vi.mock("@supabase/supabase-js", () => ({
  createClient: createClientMock,
}));

describe("createSupabaseAdminClient", () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
  });

  it("constructs a service-role client when env present and caches it", async () => {
    vi.doMock("@/lib/utils/env", () => ({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-key",
      },
      requireEnv: (k: string) =>
        k === "NEXT_PUBLIC_SUPABASE_URL"
          ? "https://x.supabase.co"
          : "service-key",
    }));
    const mod = await import("./admin");
    const a = mod.createSupabaseAdminClient();
    const b = mod.createSupabaseAdminClient();
    expect(a).toBe(b);
    expect(createClientMock).toHaveBeenCalledOnce();
    const [, , opts] = createClientMock.mock.calls[0] as [
      string,
      string,
      { auth: { autoRefreshToken: boolean; persistSession: boolean } },
    ];
    expect(opts.auth.autoRefreshToken).toBe(false);
    expect(opts.auth.persistSession).toBe(false);
  });

  it("throws when SUPABASE_SERVICE_ROLE_KEY is missing", async () => {
    vi.doMock("@/lib/utils/env", () => ({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      },
      requireEnv: (k: string) => {
        if (k === "SUPABASE_SERVICE_ROLE_KEY") {
          throw new Error(`Missing required environment variable: ${k}`);
        }
        return "https://x.supabase.co";
      },
    }));
    const mod = await import("./admin");
    expect(() => mod.createSupabaseAdminClient()).toThrow(
      /Missing required environment variable/,
    );
  });
});
