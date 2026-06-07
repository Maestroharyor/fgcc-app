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
  sendWhatsAppReminderEmail: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendWhatsAppReminderEmail: hoisted.sendWhatsAppReminderEmail,
}));

import { GET, POST } from "./route";

function makeReq(payload: unknown) {
  return new NextRequest(
    "http://localhost:3000/api/admin/registrations/whatsapp-reminder",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}

function mockRegistrations(
  result: MockResult | ((chain: ChainCall) => MockResult),
) {
  supabase = createSupabaseMock({ from: { registrations: result } });
  hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
}

const row = (over: Record<string, unknown> = {}) => ({
  id: "reg-1",
  full_name: "John Adeyemi",
  email: "john@example.com",
  reference_number: "SKU-PHO-001",
  track_code: "PHO",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({
    role: "admin",
    userId: "u1",
    email: "admin@x.com",
  });
  hoisted.sendWhatsAppReminderEmail.mockResolvedValue({ ok: true });
  mockRegistrations({ data: [row()], error: null });
});

describe("POST /api/admin/registrations/whatsapp-reminder", () => {
  it("rejects a body with neither id nor all", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
    expect(hoisted.sendWhatsAppReminderEmail).not.toHaveBeenCalled();
  });

  it("sends to a single registrant by id with the track's WhatsApp link", async () => {
    const res = await POST(makeReq({ id: "reg-1" }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, sent: 1, skipped: 0 });

    expect(hoisted.sendWhatsAppReminderEmail).toHaveBeenCalledWith(
      "john@example.com",
      expect.objectContaining({
        firstName: "John",
        referenceNumber: "SKU-PHO-001",
        whatsappUrl: expect.stringContaining("chat.whatsapp.com"),
      }),
    );
    // The single-send path scopes the SELECT to the row.
    const select = supabase._calls[0];
    expect(
      select.filters.some(
        (f) => f.method === "eq" && f.args[0] === "id" && f.args[1] === "reg-1",
      ),
    ).toBe(true);
  });

  it("bulk-sends to all, skipping placeholder emails and unknown tracks", async () => {
    mockRegistrations({
      data: [
        row(),
        row({ id: "reg-2", email: "noemail+x@placeholder.skillup" }),
        row({ id: "reg-3", email: "real@example.com", track_code: "ZZZ" }),
      ],
      error: null,
    });

    const res = await POST(makeReq({ all: true }));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, sent: 1, skipped: 2 });
    expect(hoisted.sendWhatsAppReminderEmail).toHaveBeenCalledTimes(1);
  });

  it("counts a failed send as skipped", async () => {
    hoisted.sendWhatsAppReminderEmail.mockResolvedValue({
      ok: false,
      error: "resend-not-configured",
    });
    const res = await POST(makeReq({ id: "reg-1" }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, sent: 0, skipped: 1 });
  });

  it("returns 404 when nothing matches", async () => {
    mockRegistrations({ data: [], error: null });
    const res = await POST(makeReq({ id: "missing" }));
    expect(res.status).toBe(404);
  });
});

describe("GET /api/admin/registrations/whatsapp-reminder", () => {
  it("counts deliverable recipients vs excluded placeholder rows", async () => {
    mockRegistrations({
      data: [
        row(),
        row({ id: "reg-2", email: "noemail+x@placeholder.skillup" }),
        row({ id: "reg-3", email: "real@example.com", track_code: "ZZZ" }),
        row({ id: "reg-4", email: "another@example.com" }),
      ],
      error: null,
    });

    const res = await GET();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({ ok: true, recipients: 2, excluded: 2 });
  });

  it("returns 500 on a query error", async () => {
    mockRegistrations({ data: null, error: { message: "boom" } });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});
