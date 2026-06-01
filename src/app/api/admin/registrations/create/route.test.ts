import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  sendConfirmationEmail: vi.fn(),
  sendAdminNotificationEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendConfirmationEmail: hoisted.sendConfirmationEmail,
  sendAdminNotificationEmail: hoisted.sendAdminNotificationEmail,
}));

import { POST } from "./route";

const VALID = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "08012345678",
  gender: "female",
  age_group: "26_35",
  church: "FGCC Cement",
  track_code: "UXD",
  how_heard: "whatsapp",
};

function makeReq(payload: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/create",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "admin", userId: "u1" });
  hoisted.sendConfirmationEmail.mockResolvedValue({ ok: true });
  hoisted.sendAdminNotificationEmail.mockResolvedValue({ ok: true });
  supabase = createSupabaseMock({
    from: {
      // The route runs a dedupe SELECT (getRegistrationByEmail) before the
      // INSERT. Differentiate by inspecting the recorded chain: no existing row
      // for the dedupe, a fresh reference for the insert.
      registrations: (chain) =>
        chain.filters.some((f) => f.method === "insert")
          ? { data: { reference_number: "SKU-UXD-001" }, error: null }
          : { data: null, error: null },
    },
  });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("POST /api/admin/registrations/create", () => {
  it("returns 400 for an invalid payload", async () => {
    const res = await POST(makeReq({ ...VALID, full_name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when the track code isn't in the catalogue", async () => {
    const res = await POST(makeReq({ ...VALID, track_code: "ZZ" }));
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("track-not-found");
  });

  it("returns 409 'duplicate' when the email is already registered", async () => {
    supabase = createSupabaseMock({
      from: {
        // Dedupe SELECT finds an existing row; the insert never runs.
        registrations: (chain) =>
          chain.filters.some((f) => f.method === "insert")
            ? { data: { reference_number: "SKU-UXD-002" }, error: null }
            : { data: { reference_number: "SKU-UXD-001" }, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const res = await POST(makeReq(VALID));
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("duplicate");
    expect(body.referenceNumber).toBe("SKU-UXD-001");

    const insertCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    expect(insertCall).toBeUndefined();
  });

  it("inserts with registered_via 'offline' and returns the reference", async () => {
    const res = await POST(makeReq(VALID));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.referenceNumber).toBe("SKU-UXD-001");

    const insertCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "insert"),
    );
    const insertPayload = insertCall?.filters.find((f) => f.method === "insert")
      ?.args[0] as { registered_via: string; email: string };
    expect(insertPayload.registered_via).toBe("offline");
    expect(insertPayload.email).toBe("ada@example.com");
  });

  it("synthesises a placeholder email when none is given", async () => {
    const { email, ...noEmail } = VALID;
    void email;
    const res = await POST(makeReq(noEmail));
    const body = await res.json();
    expect(body.ok).toBe(true);

    const insertCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "insert"),
    );
    const insertPayload = insertCall?.filters.find((f) => f.method === "insert")
      ?.args[0] as { email: string };
    expect(insertPayload.email).toMatch(
      /^noemail\+uxd-.*@placeholder\.skillup$/,
    );
    // No registrant confirmation when no real email was captured.
    expect(hoisted.sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("sends a confirmation email when a real address is provided", async () => {
    await POST(makeReq(VALID));
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({ referenceNumber: "SKU-UXD-001" }),
    );
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: "offline" }),
    );
  });
});
