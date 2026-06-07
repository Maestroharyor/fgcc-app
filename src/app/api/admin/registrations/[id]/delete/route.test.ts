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
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

import { DELETE } from "./route";

const ctx = (id = "reg-1") => ({ params: Promise.resolve({ id }) });

function makeReq() {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/reg-1/delete",
    { method: "DELETE" },
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
  mockRegistrations({ data: null, error: null });
});

describe("DELETE /api/admin/registrations/[id]/delete", () => {
  it("requires the superadmin role", async () => {
    await DELETE(makeReq(), ctx());
    expect(hoisted.requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("deletes the row scoped to the route id", async () => {
    const res = await DELETE(makeReq(), ctx());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);

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

  it("surfaces a delete failure as 500", async () => {
    mockRegistrations({ data: null, error: { message: "rls denied" } });
    const res = await DELETE(makeReq(), ctx());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("delete-failed");
  });
});
