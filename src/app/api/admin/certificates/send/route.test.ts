import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
  sendCertificateEmail: vi.fn<
    (...a: unknown[]) => Promise<{ ok: boolean; error?: string }>
  >(async () => ({ ok: true })),
  loadCertificateSignatory: vi.fn(async () => ({
    name: "Pastor A",
    title: "Chairman, Planning Committee",
    image: null,
  })),
  buildCertificate: vi.fn(async () => Buffer.from("%PDF-test")),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: hoisted.createSupabaseAdminClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendCertificateEmail: hoisted.sendCertificateEmail,
}));

vi.mock("@/lib/db/signatories", () => ({
  loadCertificateSignatory: hoisted.loadCertificateSignatory,
}));

vi.mock("@/lib/pdf/certificate", () => ({
  buildCertificate: hoisted.buildCertificate,
}));

import { POST } from "./route";

function makeReq(body: unknown) {
  return new NextRequest("http://localhost:3000/api/admin/certificates/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const fixture = {
  id: "r1",
  full_name: "Ada",
  email: "ada@example.com",
  reference_number: "SKU-UXD-001",
  track_code: "UXD",
  certificate_attempts: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
  hoisted.sendCertificateEmail.mockResolvedValue({ ok: true });
  supabase = createSupabaseMock();
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
  hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
});

describe("POST /api/admin/certificates/send", () => {
  it("returns 400 when reference_number is missing", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the registration is not found", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    expect(res.status).toBe(404);
  });

  it("sends a single certificate and reports the result", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: fixture, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);

    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(hoisted.sendCertificateEmail).toHaveBeenCalledOnce();
    // The send is stamped onto the registration.
    const updateCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall).toBeDefined();
  });

  it("reports ok:false when the send fails", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: fixture, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.sendCertificateEmail.mockResolvedValueOnce({
      ok: false,
      error: "rate limited",
    });

    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.failed).toBe(1);
  });

  it("returns 422 for a placeholder email", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: { ...fixture, email: "x@placeholder.skillup" },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await POST(makeReq({ reference_number: "SKU-UXD-001" }));
    expect(res.status).toBe(422);
  });
});
