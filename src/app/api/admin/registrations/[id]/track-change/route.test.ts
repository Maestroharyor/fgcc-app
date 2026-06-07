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
  createActionCode: vi.fn(),
  verifyAndConsumeActionCode: vi.fn(),
  sendAdminActionCodeEmail: vi.fn(),
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

vi.mock("@/lib/db/action-codes", () => ({
  createActionCode: hoisted.createActionCode,
  verifyAndConsumeActionCode: hoisted.verifyAndConsumeActionCode,
}));

vi.mock("@/lib/email/send", () => ({
  sendAdminActionCodeEmail: hoisted.sendAdminActionCodeEmail,
  sendTrackChangedEmail: hoisted.sendTrackChangedEmail,
}));

import { PATCH, POST } from "./route";

const ctx = (id = "reg-1") => ({ params: Promise.resolve({ id }) });

function makeReq(method: string, payload: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/reg-1/track-change",
    {
      method,
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
  hoisted.createActionCode.mockResolvedValue({
    ok: true,
    code: "AB12CD",
    expiresMinutes: 10,
  });
  hoisted.verifyAndConsumeActionCode.mockResolvedValue({
    ok: true,
    payload: { new_track_code: "GFX" },
  });
  hoisted.sendAdminActionCodeEmail.mockResolvedValue({ ok: true });
  hoisted.sendTrackChangedEmail.mockResolvedValue({ ok: true });
  mockRegistrations();
});

describe("POST /api/admin/registrations/[id]/track-change (request code)", () => {
  it("creates a code and emails it to the logged-in admin", async () => {
    const res = await POST(makeReq("POST", { track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(hoisted.createActionCode).toHaveBeenCalledWith({
      registrationId: "reg-1",
      adminUserId: "u1",
      action: "track_change",
      payload: { new_track_code: "GFX" },
    });
    expect(hoisted.sendAdminActionCodeEmail).toHaveBeenCalledWith(
      "admin@x.com",
      expect.objectContaining({
        code: "AB12CD",
        actionLabel: "Change track",
        registrantName: "John Adeyemi",
      }),
    );
  });

  it("rejects when the admin has no email", async () => {
    hoisted.requireRole.mockResolvedValue({
      role: "admin",
      userId: "u1",
      email: null,
    });
    const res = await POST(makeReq("POST", { track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("admin-no-email");
    expect(hoisted.createActionCode).not.toHaveBeenCalled();
  });

  it("rejects the registrant's current track", async () => {
    const res = await POST(makeReq("POST", { track_code: "PHO" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("same-track");
  });

  it("rejects a full target track", async () => {
    hoisted.getTrackCounts.mockResolvedValue({ GFX: 999 });
    const res = await POST(makeReq("POST", { track_code: "GFX" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("track-full");
    expect(hoisted.createActionCode).not.toHaveBeenCalled();
  });

  it("rejects a closed target track", async () => {
    // UXD is closed in the catalogue, so it reads as full even when empty.
    const res = await POST(makeReq("POST", { track_code: "UXD" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("track-full");
  });

  it("rejects an unknown track", async () => {
    const res = await POST(makeReq("POST", { track_code: "ZZZ" }), ctx());
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/admin/registrations/[id]/track-change (confirm)", () => {
  it("rejects a wrong code without touching the row", async () => {
    hoisted.verifyAndConsumeActionCode.mockResolvedValue({
      ok: false,
      error: "invalid",
    });
    const res = await PATCH(
      makeReq("PATCH", { track_code: "GFX", code: "WRONG1" }),
      ctx(),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid");
    expect(
      supabase._calls.some((c) => c.filters.some((f) => f.method === "update")),
    ).toBe(false);
  });

  it("re-checks capacity BEFORE consuming the code", async () => {
    hoisted.getTrackCounts.mockResolvedValue({ GFX: 999 });
    const res = await PATCH(
      makeReq("PATCH", { track_code: "GFX", code: "AB12CD" }),
      ctx(),
    );
    expect(res.status).toBe(409);
    expect(hoisted.verifyAndConsumeActionCode).not.toHaveBeenCalled();
  });

  it("rejects a code issued for a different target track", async () => {
    hoisted.verifyAndConsumeActionCode.mockResolvedValue({
      ok: true,
      payload: { new_track_code: "CWD" },
    });
    const res = await PATCH(
      makeReq("PATCH", { track_code: "GFX", code: "AB12CD" }),
      ctx(),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("code-mismatch");
  });

  it("updates the track, returns the regenerated reference, and emails the registrant", async () => {
    const res = await PATCH(
      makeReq("PATCH", { track_code: "GFX", code: "AB12CD" }),
      ctx(),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, reference_number: "SKU-GFX-009" });

    const updateCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall?.payload).toEqual({ track_code: "GFX" });

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
    const res = await PATCH(
      makeReq("PATCH", { track_code: "GFX", code: "AB12CD" }),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(hoisted.sendTrackChangedEmail).not.toHaveBeenCalled();
  });
});
