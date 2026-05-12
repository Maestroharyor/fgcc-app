import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixtureRegistration } from "@/test/fixtures/tracks";

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  listRegistrations: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/db/registrations", () => ({
  listRegistrations: hoisted.listRegistrations,
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "admin", userId: "u1" });
  hoisted.listRegistrations.mockResolvedValue({
    rows: [fixtureRegistration],
    total: 1,
    page: 1,
    pageSize: 5000,
  });
});

describe("GET /api/admin/export", () => {
  it("defaults to CSV with the right Content-Type and header row", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/api/admin/export"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    expect(res.headers.get("Content-Disposition")).toContain(".csv");
    const text = await res.text();
    expect(text.startsWith("Reference,Full name")).toBe(true);
    expect(text).toContain(fixtureRegistration.reference_number);
  });

  it("returns an xlsx buffer with the ZIP magic bytes for format=xlsx", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/api/admin/export?format=xlsx"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain(
      "officedocument.spreadsheetml.sheet",
    );
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it("returns a PDF buffer with the %PDF- header for format=pdf", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/api/admin/export?format=pdf"),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/pdf");
    const buf = Buffer.from(await res.arrayBuffer());
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("forwards filter params to listRegistrations", async () => {
    await GET(
      new NextRequest(
        "http://localhost:3000/api/admin/export?q=ada&track=UXD&type=self&attended=yes",
      ),
    );
    const args = hoisted.listRegistrations.mock.calls[0]?.[0] as {
      query: string;
      trackCode: string;
      type: string;
      attended: boolean;
    };
    expect(args.query).toBe("ada");
    expect(args.trackCode).toBe("UXD");
    expect(args.type).toBe("self");
    expect(args.attended).toBe(true);
  });
});
