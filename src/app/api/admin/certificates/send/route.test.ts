import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  sendCertificateEmail: vi.fn(async () => ({ ok: true })),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendCertificateEmail: hoisted.sendCertificateEmail,
}));

import { POST } from "./route";

function makeReq(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/certificates/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
  supabase = createSupabaseMock();
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("POST /api/admin/certificates/send", () => {
  it("returns 404 when there are no matching attendees", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: [], error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    expect(res.status).toBe(404);
  });

  it("sends to a single attendee when reference_number is given", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              full_name: "Ada",
              email: "ada@example.com",
              reference_number: "SKU-UXD-001",
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(hoisted.sendCertificateEmail).toHaveBeenCalledOnce();
  });

  it("skips placeholder emails in bulk send", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              full_name: "Ada",
              email: "ada@example.com",
              reference_number: "SKU-UXD-001",
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
            {
              id: "r2",
              full_name: "Placeholder",
              email: "noemail+x@placeholder.skillup",
              reference_number: "SKU-UXD-002",
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeReq({ all: true }));
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
  });
});
