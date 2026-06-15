import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  listCertificateRecipients: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: hoisted.createSupabaseAdminClient,
}));
vi.mock("@/lib/db/registrations", () => ({
  listCertificateRecipients: hoisted.listCertificateRecipients,
}));

import { POST } from "./route";

function makeReq(body: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/certificates/schedule",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
  supabase = createSupabaseMock();
  hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
});

describe("POST /api/admin/certificates/schedule", () => {
  it("rejects an invalid payload", async () => {
    const res = await POST(makeReq({ dayKeys: [], perDay: 0, startDate: "x" }));
    expect(res.status).toBe(400);
  });

  it("rejects a start date in the past", async () => {
    const res = await POST(
      makeReq({
        dayKeys: ["2026-06-12"],
        perDay: 50,
        startDate: "2000-01-01",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when no one is eligible", async () => {
    hoisted.listCertificateRecipients.mockResolvedValue([]);
    const res = await POST(
      makeReq({
        dayKeys: ["2026-06-12"],
        perDay: 50,
        startDate: "2999-01-01",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("assigns days and returns the plan", async () => {
    hoisted.listCertificateRecipients.mockResolvedValue([
      { id: "a" },
      { id: "b" },
      { id: "c" },
    ]);
    const res = await POST(
      makeReq({
        dayKeys: ["2026-06-12"],
        perDay: 2,
        startDate: "2999-01-01",
      }),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.totalRecipients).toBe(3);
    expect(body.days).toHaveLength(2);
    // One bulk update per day group.
    const updates = supabase._calls.filter(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "update"),
    );
    expect(updates).toHaveLength(2);
  });
});
