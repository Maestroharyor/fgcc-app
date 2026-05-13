import { NextRequest, NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  createSupabaseProxyClient: vi.fn(),
  envState: {
    NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "anon",
  } as {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  },
}));

vi.mock("@/lib/supabase/proxy", () => ({
  createSupabaseProxyClient: hoisted.createSupabaseProxyClient,
}));

vi.mock("@/lib/utils/env", () => ({
  env: hoisted.envState,
}));

import { proxy } from "./proxy";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.envState.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
  hoisted.envState.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "anon";
  supabase = createSupabaseMock({ user: null });
  hoisted.createSupabaseProxyClient.mockReturnValue({
    supabase,
    response: NextResponse.next(),
  });
});

describe("proxy()", () => {
  it("passes through non-admin paths without touching Supabase", async () => {
    const res = await proxy(new NextRequest("http://localhost:3000/skillup"));
    expect(hoisted.createSupabaseProxyClient).not.toHaveBeenCalled();
    expect(res.status).toBe(200);
  });

  it("redirects /admin/* to login when Supabase env is missing", async () => {
    hoisted.envState.NEXT_PUBLIC_SUPABASE_URL = undefined;
    hoisted.envState.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = undefined;
    const res = await proxy(
      new NextRequest("http://localhost:3000/admin/dashboard"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/login");
    expect(res.headers.get("location")).toContain(
      "error=supabase-not-configured",
    );
  });

  it("passes through /admin/login when env is missing", async () => {
    hoisted.envState.NEXT_PUBLIC_SUPABASE_URL = undefined;
    hoisted.envState.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = undefined;
    const res = await proxy(
      new NextRequest("http://localhost:3000/admin/login"),
    );
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated /admin/* to /admin/login?next=...", async () => {
    supabase = createSupabaseMock({ user: null });
    hoisted.createSupabaseProxyClient.mockReturnValue({
      supabase,
      response: NextResponse.next(),
    });
    const res = await proxy(
      new NextRequest("http://localhost:3000/admin/registrations?foo=bar"),
    );
    expect(res.status).toBe(307);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("/admin/login");
    expect(loc).toContain("next=%2Fadmin%2Fregistrations");
  });

  it("redirects authenticated users away from /admin/login → /admin/dashboard", async () => {
    supabase = createSupabaseMock({ user: { id: "u1", email: "a@b.c" } });
    hoisted.createSupabaseProxyClient.mockReturnValue({
      supabase,
      response: NextResponse.next(),
    });
    const res = await proxy(
      new NextRequest("http://localhost:3000/admin/login"),
    );
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/dashboard");
  });

  it("returns the refreshed proxy response when user is authed on /admin/*", async () => {
    supabase = createSupabaseMock({ user: { id: "u1", email: "a@b.c" } });
    const expected = NextResponse.next();
    hoisted.createSupabaseProxyClient.mockReturnValue({
      supabase,
      response: expected,
    });
    const res = await proxy(
      new NextRequest("http://localhost:3000/admin/dashboard"),
    );
    expect(res).toBe(expected);
  });
});
