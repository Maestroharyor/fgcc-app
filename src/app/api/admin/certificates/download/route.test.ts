import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  loadCertificateSignatories: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/db/signatories", () => ({
  loadCertificateSignatories: hoisted.loadCertificateSignatories,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "admin", userId: "u1" });
  hoisted.loadCertificateSignatories.mockResolvedValue([
    { name: "Pastor A", title: "Chairman, Planning Committee", image: null },
    { name: "", title: "Programme Convener", image: null },
  ]);
  supabase = createSupabaseMock();
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("GET /api/admin/certificates/download", () => {
  it("returns 404 when ref is not attended or missing", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("returns a PDF when ref is provided and attended", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            full_name: "Ada",
            reference_number: "SKU-UXD-001",
            attended: true,
            tracks: { name: "UI/UX Design", facilitator_name: "F" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001",
      ),
    );
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("returns a ZIP of all attendees when no ref is provided", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              full_name: "Ada",
              reference_number: "SKU-UXD-001",
              attended: true,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
            {
              full_name: "Babs",
              reference_number: "SKU-UXD-002",
              attended: true,
              tracks: { name: "UI/UX Design", facilitator_name: "F" },
            },
          ],
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest("http://localhost:3000/api/admin/certificates/download"),
    );
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    const buf = Buffer.from(await res.arrayBuffer());
    // ZIP signature
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("gates the regular download behind admin", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001",
      ),
    );
    expect(hoisted.requireRole).toHaveBeenCalledWith("admin");
  });
});

describe("GET /api/admin/certificates/download?preview=1", () => {
  it("requires superadmin", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001&preview=1",
      ),
    );
    expect(hoisted.requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("returns an inline PDF for a NON-attended registrant", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            full_name: "Ada",
            reference_number: "SKU-UXD-001",
            attended: false,
            track_code: "UXD",
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001&preview=1",
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    expect(res.headers.get("Content-Disposition")).toContain("inline");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("still 404s for an unknown reference", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-NOPE-999&preview=1",
      ),
    );
    expect(res.status).toBe(404);
  });

  it("keeps the 404 for non-attended WITHOUT preview", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            full_name: "Ada",
            reference_number: "SKU-UXD-001",
            attended: false,
            track_code: "UXD",
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/certificates/download?ref=SKU-UXD-001",
      ),
    );
    expect(res.status).toBe(404);
  });
});
