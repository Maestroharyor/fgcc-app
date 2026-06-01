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

const row = (over: Record<string, unknown> = {}) => ({
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "08012345678",
  gender: "female",
  age_group: "26_35",
  church: "FGCC Cement",
  track_code: "UXD",
  ...over,
});

/** Body the batch route expects. */
const batch = (...registrants: Array<Record<string, unknown>>) => ({
  registrants,
});

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
      // Each row runs a dedupe SELECT (getRegistrationByEmail) before its
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

describe("POST /api/admin/registrations/create (batch)", () => {
  it("returns 400 when there are no registrants", async () => {
    const res = await POST(makeReq(batch()));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid row", async () => {
    const res = await POST(makeReq(batch(row({ full_name: "" }))));
    expect(res.status).toBe(400);
  });

  it("inserts a single row with registered_via 'offline' and returns its reference", async () => {
    const res = await POST(makeReq(batch(row())));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(1);
    expect(body.results[0]).toMatchObject({
      status: "ok",
      referenceNumber: "SKU-UXD-001",
    });

    const insertCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    const insertPayload = insertCall?.filters.find((f) => f.method === "insert")
      ?.args[0] as { registered_via: string; email: string };
    expect(insertPayload.registered_via).toBe("offline");
    expect(insertPayload.email).toBe("ada@example.com");
  });

  it("processes multiple rows and returns a result per row", async () => {
    const res = await POST(
      makeReq(
        batch(
          row({ full_name: "Ada", email: "ada@example.com" }),
          row({
            full_name: "Grace",
            email: "grace@example.com",
            track_code: "CWD",
          }),
        ),
      ),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(2);
    expect(
      body.results.every((r: { status: string }) => r.status === "ok"),
    ).toBe(true);
    const inserts = supabase._calls.filter((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    expect(inserts).toHaveLength(2);
  });

  it("marks a row 'duplicate' when its email already exists and skips its insert", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: (chain) =>
          chain.filters.some((f) => f.method === "insert")
            ? { data: { reference_number: "SKU-UXD-999" }, error: null }
            : { data: { reference_number: "SKU-UXD-001" }, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const res = await POST(makeReq(batch(row())));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results[0]).toMatchObject({
      status: "duplicate",
      referenceNumber: "SKU-UXD-001",
    });
    const inserts = supabase._calls.filter((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    expect(inserts).toHaveLength(0);
  });

  it("marks the second row 'duplicate' when an email repeats within the batch", async () => {
    const res = await POST(
      makeReq(batch(row(), row({ full_name: "Ada (again)" }))),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results[0].status).toBe("ok");
    expect(body.results[1]).toMatchObject({
      status: "duplicate",
      message: "repeated in this batch",
    });
    // Only the first row inserts; the repeat is caught before any DB write.
    const inserts = supabase._calls.filter((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    expect(inserts).toHaveLength(1);
  });

  it("marks a row 'error' when the track code isn't in the catalogue", async () => {
    const res = await POST(makeReq(batch(row({ track_code: "ZZ" }))));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results[0]).toMatchObject({
      status: "error",
      message: "track-not-found",
    });
  });

  it("synthesises a placeholder email when a row has none", async () => {
    const res = await POST(makeReq(batch(row({ email: undefined }))));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results[0].status).toBe("ok");

    const insertCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    const insertPayload = insertCall?.filters.find((f) => f.method === "insert")
      ?.args[0] as { email: string };
    expect(insertPayload.email).toMatch(
      /^noemail\+uxd-.*@placeholder\.skillup$/,
    );
    expect(hoisted.sendConfirmationEmail).not.toHaveBeenCalled();
  });

  it("inserts a null phone when a row has none (admin phone is optional)", async () => {
    const res = await POST(makeReq(batch(row({ phone: undefined }))));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.results[0].status).toBe("ok");

    const insertCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "insert"),
    );
    const insertPayload = insertCall?.filters.find((f) => f.method === "insert")
      ?.args[0] as { phone: string | null };
    expect(insertPayload.phone).toBeNull();
  });

  it("sends a confirmation per real email and one admin notification", async () => {
    await POST(makeReq(batch(row())));
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledTimes(1);
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({ referenceNumber: "SKU-UXD-001" }),
    );
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledTimes(1);
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledWith(
      expect.objectContaining({ type: "offline" }),
    );
  });
});
