import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(() => ({ mock: "client" })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { createSupabaseProxyClient } from "./proxy";

describe("createSupabaseProxyClient", () => {
  beforeEach(() => {
    createServerClientMock.mockClear();
  });

  it("returns supabase + a NextResponse populated by the cookie store", () => {
    const request = new NextRequest("http://localhost:3000/admin/dashboard");
    const result = createSupabaseProxyClient(request);
    expect(result.supabase).toEqual({ mock: "client" });
    expect(result.response).toBeDefined();
    expect(typeof result.response.cookies.set).toBe("function");
  });

  it("plumbs request cookies into the supabase cookie adapter", () => {
    const request = new NextRequest("http://localhost:3000/admin/dashboard", {
      headers: { cookie: "sb-access-token=abc; theme=dark" },
    });
    createSupabaseProxyClient(request);
    const opts = createServerClientMock.mock.calls[0]?.[2] as {
      cookies: { getAll: () => Array<{ name: string; value: string }> };
    };
    const all = opts.cookies.getAll();
    expect(all.some((c) => c.name === "sb-access-token")).toBe(true);
    expect(all.some((c) => c.name === "theme")).toBe(true);
  });
});
