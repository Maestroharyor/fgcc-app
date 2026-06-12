import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

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

import { DELETE, POST } from "./route";

function makeJsonReq(payload: unknown, method: "POST" | "DELETE" = "POST") {
  return new NextRequest("http://localhost:3000/api/admin/checkin", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "admin", userId: "u1" });
  supabase = createSupabaseMock();
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
});

describe("POST /api/admin/checkin", () => {
  it("returns 400 for an invalid reference", async () => {
    const res = await POST(makeJsonReq({ reference_number: "abc" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the reference doesn't exist", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeJsonReq({ reference_number: "SKU-UXD-001" }));
    expect(res.status).toBe(404);
  });

  it("returns alreadyChecked:true when already checked in today (legacy row)", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: true,
            // Pre-migration row: no attendance_log, single attended_at today.
            attended_at: new Date().toISOString(),
            track_id: "t1",
            tracks: { name: "UI/UX Design" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeJsonReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.alreadyChecked).toBe(true);
    expect(body.daysAttended).toBe(1);
    expect(body.registrant.referenceNumber).toBe("SKU-UXD-001");
  });

  it("returns alreadyChecked:true when today is already in the log", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: true,
            attended_at: new Date().toISOString(),
            attendance_log: [
              "2020-01-01T09:30:00.000Z",
              new Date().toISOString(),
            ],
            track_id: "t1",
            tracks: { name: "UI/UX Design" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeJsonReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.alreadyChecked).toBe(true);
    expect(body.daysAttended).toBe(2);
  });

  it("appends a second day to the attendance log", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: true,
            attended_at: "2020-01-01T09:30:00.000Z",
            attendance_log: ["2020-01-01T09:30:00.000Z"],
            track_id: "t1",
            tracks: { name: "UI/UX Design" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeJsonReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.daysAttended).toBe(2);
    const updatePayload = supabase._calls
      .find(
        (c) =>
          c.table === "registrations" &&
          c.filters.some((f) => f.method === "update"),
      )
      ?.filters.find((f) => f.method === "update")?.args[0] as {
      attended: boolean;
      attendance_log: string[];
    };
    expect(updatePayload.attended).toBe(true);
    expect(updatePayload.attendance_log).toHaveLength(2);
    expect(updatePayload.attendance_log[0]).toBe("2020-01-01T09:30:00.000Z");
  });

  it("flips attended → true on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: false,
            track_id: "t1",
            tracks: { name: "UI/UX Design" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await POST(makeJsonReq({ reference_number: "SKU-UXD-001" }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.registrant.fullName).toBe("Ada");
    const updateCall = supabase._calls.find(
      (c) =>
        c.table === "registrations" &&
        c.filters.some((f) => f.method === "update"),
    );
    expect(updateCall).toBeDefined();
    const updatePayload = updateCall?.filters.find((f) => f.method === "update")
      ?.args[0] as { attended: boolean };
    expect(updatePayload.attended).toBe(true);
  });

  it("undo removes today's entry and flips attended → false (single-day row)", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: true,
            attended_at: new Date().toISOString(),
            attendance_log: [new Date().toISOString()],
            track_code: "UXD",
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await DELETE(
      makeJsonReq({ reference_number: "SKU-UXD-001" }, "DELETE"),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.attended).toBe(false);
    expect(body.daysAttended).toBe(0);
    const updatePayload = supabase._calls
      .find(
        (c) =>
          c.table === "registrations" &&
          c.filters.some((f) => f.method === "update"),
      )
      ?.filters.find((f) => f.method === "update")?.args[0] as {
      attended: boolean;
      attendance_log: string[];
    };
    expect(updatePayload.attended).toBe(false);
    expect(updatePayload.attendance_log).toEqual([]);
  });

  it("undo keeps attended → true when an earlier day remains", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: true,
            attended_at: new Date().toISOString(),
            attendance_log: [
              "2020-01-01T09:30:00.000Z",
              new Date().toISOString(),
            ],
            track_code: "UXD",
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await DELETE(
      makeJsonReq({ reference_number: "SKU-UXD-001" }, "DELETE"),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.attended).toBe(true);
    expect(body.daysAttended).toBe(1);
    const updatePayload = supabase._calls
      .find(
        (c) =>
          c.table === "registrations" &&
          c.filters.some((f) => f.method === "update"),
      )
      ?.filters.find((f) => f.method === "update")?.args[0] as {
      attendance_log: string[];
    };
    expect(updatePayload.attendance_log).toEqual(["2020-01-01T09:30:00.000Z"]);
  });

  it("undo returns 404 when the reference doesn't exist", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const res = await DELETE(
      makeJsonReq({ reference_number: "SKU-UXD-001" }, "DELETE"),
    );
    expect(res.status).toBe(404);
  });

  it("accepts form-encoded payloads too", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: {
            id: "r1",
            reference_number: "SKU-UXD-001",
            full_name: "Ada",
            attended: false,
            track_id: "t1",
            tracks: { name: "UI/UX" },
          },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const fd = new FormData();
    fd.set("reference_number", "SKU-UXD-001");
    const res = await POST(
      new NextRequest("http://localhost:3000/api/admin/checkin", {
        method: "POST",
        body: fd,
      }),
    );
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
