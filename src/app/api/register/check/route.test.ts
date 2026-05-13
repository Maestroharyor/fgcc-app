import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient,
}));

import { GET } from "./route";

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseAdminClient.mockReturnValue(supabase);
});

describe("GET /api/register/check", () => {
  it("returns {found:false} when email param is missing", async () => {
    const res = await GET(
      new NextRequest("http://localhost:3000/api/register/check"),
    );
    const body = await res.json();
    expect(body).toEqual({ found: false });
  });

  it("returns the match with track name resolved from static TRACKS", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            reference_number: "SKU-UXD-001",
            full_name: "Ada Lovelace",
            track_code: "UXD",
          },
          error: null,
        },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(
      new NextRequest(
        "http://localhost:3000/api/register/check?email=ADA@example.com",
      ),
    );
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.reference_number).toBe("SKU-UXD-001");
    expect(body.track_name).toBe("UI/UX Design");
  });

  it("returns empty track_name when track_code is unknown", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            reference_number: "SKU-XXX-002",
            full_name: "Femi",
            track_code: "XXX",
          },
          error: null,
        },
      },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(
      new NextRequest("http://localhost:3000/api/register/check?email=f@x.com"),
    );
    const body = await res.json();
    expect(body.found).toBe(true);
    expect(body.track_name).toBe("");
  });

  it("returns {found:false} (gracefully) when Supabase errors", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: { message: "boom" } } },
    });
    createSupabaseAdminClient.mockReturnValue(supabase);
    const res = await GET(
      new NextRequest("http://localhost:3000/api/register/check?email=x@x.com"),
    );
    const body = await res.json();
    expect(body).toEqual({ found: false });
  });
});
