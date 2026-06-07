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
  createActionCode: vi.fn(),
  verifyAndConsumeActionCode: vi.fn(),
  sendAdminActionCodeEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/db/action-codes", () => ({
  createActionCode: hoisted.createActionCode,
  verifyAndConsumeActionCode: hoisted.verifyAndConsumeActionCode,
}));

vi.mock("@/lib/email/send", () => ({
  sendAdminActionCodeEmail: hoisted.sendAdminActionCodeEmail,
}));

import { DELETE, POST } from "./route";

const ctx = (id = "reg-1") => ({ params: Promise.resolve({ id }) });

function makeReq(method: string, payload?: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/reg-1/delete",
    {
      method,
      headers: { "Content-Type": "application/json" },
      body: payload === undefined ? undefined : JSON.stringify(payload),
    },
  );
}

function mockRegistrations(
  result: MockResult | ((chain: ChainCall) => MockResult),
) {
  supabase = createSupabaseMock({ from: { registrations: result } });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({
    role: "superadmin",
    userId: "u1",
    email: "super@x.com",
  });
  hoisted.createActionCode.mockResolvedValue({
    ok: true,
    code: "AB12CD",
    expiresMinutes: 10,
  });
  hoisted.verifyAndConsumeActionCode.mockResolvedValue({
    ok: true,
    payload: {},
  });
  hoisted.sendAdminActionCodeEmail.mockResolvedValue({ ok: true });
  mockRegistrations({
    data: {
      id: "reg-1",
      full_name: "John Adeyemi",
      reference_number: "SKU-PHO-001",
    },
    error: null,
  });
});

describe("POST /api/admin/registrations/[id]/delete (request code)", () => {
  it("requires the superadmin role", async () => {
    await POST(makeReq("POST"), ctx());
    expect(hoisted.requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("creates a delete code and emails it to the superadmin", async () => {
    const res = await POST(makeReq("POST"), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(hoisted.createActionCode).toHaveBeenCalledWith({
      registrationId: "reg-1",
      adminUserId: "u1",
      action: "delete_registration",
    });
    expect(hoisted.sendAdminActionCodeEmail).toHaveBeenCalledWith(
      "super@x.com",
      expect.objectContaining({
        code: "AB12CD",
        actionLabel: "Delete registration",
        detail: "SKU-PHO-001",
      }),
    );
  });

  it("rejects when the admin has no email", async () => {
    hoisted.requireRole.mockResolvedValue({
      role: "superadmin",
      userId: "u1",
      email: null,
    });
    const res = await POST(makeReq("POST"), ctx());
    expect(res.status).toBe(400);
    expect(hoisted.createActionCode).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing registration", async () => {
    mockRegistrations({ data: null, error: null });
    const res = await POST(makeReq("POST"), ctx("missing"));
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/registrations/[id]/delete (confirm)", () => {
  it("rejects a wrong code without deleting", async () => {
    hoisted.verifyAndConsumeActionCode.mockResolvedValue({
      ok: false,
      error: "invalid",
    });
    const res = await DELETE(makeReq("DELETE", { code: "WRONG1" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("invalid");
    expect(
      supabase._calls.some((c) => c.filters.some((f) => f.method === "delete")),
    ).toBe(false);
  });

  it("rejects a malformed code body", async () => {
    const res = await DELETE(makeReq("DELETE", { code: "nope" }), ctx());
    expect(res.status).toBe(400);
    expect(hoisted.verifyAndConsumeActionCode).not.toHaveBeenCalled();
  });

  it("deletes the row once the code verifies", async () => {
    const res = await DELETE(makeReq("DELETE", { code: "AB12CD" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

    expect(hoisted.verifyAndConsumeActionCode).toHaveBeenCalledWith({
      registrationId: "reg-1",
      adminUserId: "u1",
      action: "delete_registration",
      code: "AB12CD",
    });
    const deleteCall = supabase._calls.find((c) =>
      c.filters.some((f) => f.method === "delete"),
    );
    expect(deleteCall).toBeDefined();
    expect(
      deleteCall?.filters.some(
        (f) => f.method === "eq" && f.args[0] === "id" && f.args[1] === "reg-1",
      ),
    ).toBe(true);
  });

  it("surfaces a delete failure", async () => {
    mockRegistrations((chain: ChainCall) =>
      chain.filters.some((f) => f.method === "delete")
        ? { data: null, error: { message: "rls denied" } }
        : { data: null, error: null },
    );
    const res = await DELETE(makeReq("DELETE", { code: "AB12CD" }), ctx());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("delete-failed");
  });
});
