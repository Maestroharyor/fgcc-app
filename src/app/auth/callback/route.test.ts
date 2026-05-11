import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseRouteClient } = vi.hoisted(() => ({
  createSupabaseRouteClient: vi.fn(),
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient,
}));

import { GET } from "./route";

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseRouteClient.mockResolvedValue(supabase);
});

describe("GET /auth/callback", () => {
  it("exchanges the code and redirects to ?next=", async () => {
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/auth/callback?code=abc&next=/admin/registrations",
      ),
    );
    expect(supabase.auth.exchangeCodeForSession).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin/registrations");
  });

  it("redirects to /admin/dashboard by default when no `next` is provided", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/auth/callback?code=xyz"),
    );
    expect(res.headers.get("location")).toContain("/admin/dashboard");
  });

  it("skips the exchange when no `code` is provided", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/auth/callback"),
    );
    expect(supabase.auth.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(res.status).toBe(307);
  });
});
