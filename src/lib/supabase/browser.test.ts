import { beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: createBrowserClientMock,
}));

vi.mock("@/lib/utils/env", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon-key",
  },
}));

describe("createSupabaseBrowserClient", () => {
  beforeEach(() => {
    vi.resetModules();
    createBrowserClientMock.mockReset();
    createBrowserClientMock.mockReturnValue({ id: "browser" });
  });

  it("constructs once and caches the singleton", async () => {
    const mod = await import("./browser");
    const a = mod.createSupabaseBrowserClient();
    const b = mod.createSupabaseBrowserClient();
    expect(a).toBe(b);
    expect(createBrowserClientMock).toHaveBeenCalledOnce();
  });

  it("throws a clear error when env is missing", async () => {
    vi.doMock("@/lib/utils/env", () => ({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: undefined,
      },
    }));
    vi.resetModules();
    const mod = await import("./browser");
    expect(() => mod.createSupabaseBrowserClient()).toThrow(
      /Supabase URL\/Publishable key missing/,
    );
  });
});
