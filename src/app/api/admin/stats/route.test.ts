import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";
import { RedirectError } from "../../../../../vitest.setup";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseRouteClient: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/route", () => ({
  createSupabaseRouteClient: hoisted.createSupabaseRouteClient,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  supabase = createSupabaseMock();
  hoisted.createSupabaseRouteClient.mockResolvedValue(supabase);
});

describe("GET /api/admin/stats", () => {
  it("rejects unauthenticated callers (requireRole throws)", async () => {
    hoisted.requireRole.mockImplementation(() => {
      throw new RedirectError("/admin/login");
    });
    await expect(GET()).rejects.toThrow(RedirectError);
  });

  it("returns aggregated counts shape", async () => {
    hoisted.requireRole.mockResolvedValue({ userId: "u1", role: "admin" });
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [{ registered_via: "self" }, { registered_via: "others" }],
          error: null,
          count: 2,
        },
        waitlist: { data: null, error: null, count: 3 },
        v_track_capacity: { data: [], error: null },
      },
    });
    hoisted.createSupabaseRouteClient.mockResolvedValue(supabase);

    const res = await GET();
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.self).toBe(1);
    expect(body.others).toBe(1);
    expect(body.waitlist).toBe(3);
    expect(Array.isArray(body.capacity)).toBe(true);
  });
});
