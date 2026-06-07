import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChainCall,
  createSupabaseMock,
  type MockResult,
  type SupabaseMock,
} from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  getTrackCounts: vi.fn(),
  sendTrackChangedEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

// Keep the real (pure) withCapacity; only the count fetch is stubbed.
vi.mock("@/lib/db/tracks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/db/tracks")>();
  return { ...actual, getTrackCounts: hoisted.getTrackCounts };
});

vi.mock("@/lib/email/send", () => ({
  sendTrackChangedEmail: hoisted.sendTrackChangedEmail,
}));

import { PATCH } from "./route";

const ctx = (id = "reg-1") => ({ params: Promise.resolve({ id }) });

function makeReq(payload: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/reg-1/track-change",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

const regRow = {
  id: "reg-1",
  full_name: "John Adeyemi",
  email: "john@example.com",
  track_code: "PHO",
  reference_number: "SKU-PHO-001",
};

/** SELECT (load) returns the registration; UPDATE returns the new reference. */
function mockRegistrations(
  result?: MockResult | ((chain: ChainCall) => MockResult),
) {
  supabase = createSupabaseMock({
    from: {
      registrations:
        result ??
        ((chain: ChainCall) =>
          chain.filters.some((f) => f.method === "update")
            ? { data: { reference_number: "SKU-GFX-009" }, error: null }
            : { data: regRow, error: null }),
    },
  });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({
    role: "admin",
    userId: "u1",
    email: "admin@x.com",
  });
  hoisted.getTrackCounts.mockResolvedValue({});
  hoisted.sendTrackChangedEmail.mockResolvedValue({ ok: true });
  mockRegistrations();
});

describe("PATCH /api/admin/registrations/[id]/track-change", () => {
  it("returns 400 for an invalid body", async () => {
    const res = await PATCH(makeReq({}), ctx());
    expect(res.status).toBe(400);
  });

  it("returns 404 when the registration is missing", async () => {
    mockRegistrations({ data: null, error: null });
    const res = await PATCH(makeReq({ track_code: "GFX" }), ctx("missing"));
    expect(res.status).toBe(404);
  });

  it("rejects the registrant's current track", async () => {
    const res = await PATCH(makeReq({ track_code: "PHO" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("same-track");
  });

  it("rejects a full target track", async () => {
    hoisted.getTrackCounts.mockResolvedValue({ GFX: 999 });
    const res = await PATCH(makeReq({ track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("track-full");
  });

  it("rejects a closed target track", async () => {
    // UXD is closed in the catalogue, so it reads as full even when empty.
    const res = await PATCH(makeReq({ track_code: "UXD" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("track-full");
  });

  it("rejects an unknown track", async () => {
    const res = await PATCH(makeReq({ track_code: "ZZZ" }), ctx());
    expect(res.status).toBe(404);
  });

  it("updates the track, returns the regenerated reference, and emails the registrant", async () => {
    const res = await PATCH(makeReq({ track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, reference_number: "SKU-GFX-009" });

    const updateCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall?.payload).toEqual({ track_code: "GFX" });
    expect(
      updateCall?.filters.some(
        (f) => f.method === "eq" && f.args[0] === "id" && f.args[1] === "reg-1",
      ),
    ).toBe(true);

    expect(hoisted.sendTrackChangedEmail).toHaveBeenCalledWith(
      "john@example.com",
      expect.objectContaining({
        firstName: "John",
        referenceNumber: "SKU-GFX-009",
        whatsappUrl: expect.stringContaining("chat.whatsapp.com"),
      }),
    );
  });

  it("skips the registrant email for placeholder addresses", async () => {
    mockRegistrations((chain: ChainCall) =>
      chain.filters.some((f) => f.method === "update")
        ? { data: { reference_number: "SKU-GFX-009" }, error: null }
        : {
            data: { ...regRow, email: "noemail+x@placeholder.skillup" },
            error: null,
          },
    );
    const res = await PATCH(makeReq({ track_code: "GFX" }), ctx());
    expect(res.status).toBe(200);
    expect(hoisted.sendTrackChangedEmail).not.toHaveBeenCalled();
  });

  it("returns 500 when the update fails", async () => {
    mockRegistrations((chain: ChainCall) =>
      chain.filters.some((f) => f.method === "update")
        ? { data: null, error: { message: "boom" } }
        : { data: regRow, error: null },
    );
    const res = await PATCH(makeReq({ track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("update-failed");
  });
});
