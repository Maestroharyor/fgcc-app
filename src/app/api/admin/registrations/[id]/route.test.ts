import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  sendRegistrationUpdatedEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendRegistrationUpdatedEmail: hoisted.sendRegistrationUpdatedEmail,
}));

import { PATCH } from "./route";

const validBody = (over: Record<string, unknown> = {}) => ({
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "08012345678",
  gender: "female",
  age_group: "26_35",
  church: "FGCC Cement",
  ...over,
});

function makeReq(payload: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/reg-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

const ctx = (id = "reg-1") => ({ params: Promise.resolve({ id }) });

/** Configure the registrations table's terminal result for this test. */
function mockRegistrations(result: {
  data?: unknown;
  error?: { message: string } | null;
}) {
  supabase = createSupabaseMock({ from: { registrations: result } });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
}

const okRow = {
  id: "reg-1",
  reference_number: "SKU-UXD-001",
  track_code: "UXD",
  full_name: "Ada Lovelace",
};

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "admin", userId: "u1" });
  hoisted.sendRegistrationUpdatedEmail.mockResolvedValue({ ok: true });
  mockRegistrations({ data: okRow, error: null });
});

describe("PATCH /api/admin/registrations/[id]", () => {
  it("returns 400 for an invalid body", async () => {
    const res = await PATCH(makeReq(validBody({ full_name: "" })), ctx());
    expect(res.status).toBe(400);
  });

  it("updates the row and returns ok", async () => {
    const res = await PATCH(makeReq(validBody()), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    // `.select("id")` after `.update()` overwrites `operation`, so locate the
    // call by its recorded "update" filter instead.
    const updateCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall).toBeDefined();
    const payload = updateCall?.payload as {
      full_name: string;
      email: string;
      phone: string | null;
      gender: string;
      age_group: string;
      church: string;
    };
    expect(payload).toMatchObject({
      full_name: "Ada Lovelace",
      email: "ada@example.com",
      gender: "female",
      age_group: "26_35",
      church: "FGCC Cement",
    });
    // Phone is normalised to +234 form.
    expect(payload.phone).toBe("+2348012345678");
    // Scoped to the row from the route param.
    expect(
      updateCall?.filters.some(
        (f) => f.method === "eq" && f.args[0] === "id" && f.args[1] === "reg-1",
      ),
    ).toBe(true);
  });

  it("stores a null phone when none is given", async () => {
    const res = await PATCH(makeReq(validBody({ phone: "" })), ctx());
    expect(res.status).toBe(200);
    const updateCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "update"),
    );
    expect((updateCall?.payload as { phone: string | null }).phone).toBeNull();
  });

  it("returns 409 when the email collides with another row", async () => {
    const dupError = { message: "duplicate key", code: "23505" };
    mockRegistrations({ data: null, error: dupError });
    const res = await PATCH(makeReq(validBody()), ctx());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("email-taken");
  });

  it("returns 404 when no row matches the id", async () => {
    mockRegistrations({ data: null, error: null });
    const res = await PATCH(makeReq(validBody()), ctx("missing"));
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("not-found");
  });

  it("returns 500 on a generic update error", async () => {
    mockRegistrations({ data: null, error: { message: "boom" } });
    const res = await PATCH(makeReq(validBody()), ctx());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("update-failed");
  });

  it("notifies the registrant by default when a real email is on file", async () => {
    const res = await PATCH(makeReq(validBody()), ctx());
    expect(res.status).toBe(200);
    expect(hoisted.sendRegistrationUpdatedEmail).toHaveBeenCalledTimes(1);
    expect(hoisted.sendRegistrationUpdatedEmail).toHaveBeenCalledWith(
      "ada@example.com",
      expect.objectContaining({ referenceNumber: "SKU-UXD-001" }),
    );
  });

  it("does not notify when notify is false", async () => {
    const res = await PATCH(makeReq(validBody({ notify: false })), ctx());
    expect(res.status).toBe(200);
    expect(hoisted.sendRegistrationUpdatedEmail).not.toHaveBeenCalled();
  });

  it("does not notify a placeholder email", async () => {
    const res = await PATCH(
      makeReq(validBody({ email: "noemail+uxd-x@placeholder.skillup" })),
      ctx(),
    );
    expect(res.status).toBe(200);
    expect(hoisted.sendRegistrationUpdatedEmail).not.toHaveBeenCalled();
  });
});
