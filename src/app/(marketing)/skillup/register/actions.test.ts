import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureCapacityRow,
  fixtureFullCapacityRow,
} from "@/test/fixtures/tracks";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  sendConfirmationEmail: vi.fn(async () => ({ ok: true })),
  sendAdminNotificationEmail: vi.fn(async () => ({ ok: true })),
  sendWaitlistConfirmEmail: vi.fn(async () => ({ ok: true })),
  sendSubmitterSummaryEmail: vi.fn(async () => ({ ok: true })),
  qrDataUrl: vi.fn(async () => "data:image/png;base64,xxx"),
  nextWaitlistPosition: vi.fn(async () => 1),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendConfirmationEmail: hoisted.sendConfirmationEmail,
  sendAdminNotificationEmail: hoisted.sendAdminNotificationEmail,
  sendWaitlistConfirmEmail: hoisted.sendWaitlistConfirmEmail,
  sendSubmitterSummaryEmail: hoisted.sendSubmitterSummaryEmail,
}));

vi.mock("@/lib/qr/generate", () => ({
  qrDataUrl: hoisted.qrDataUrl,
}));

vi.mock("@/lib/db/waitlist", () => ({
  nextWaitlistPosition: hoisted.nextWaitlistPosition,
}));

import { revalidatePath } from "next/cache";
import { registerOthersAction, registerSelfAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.qrDataUrl.mockResolvedValue("data:image/png;base64,xxx");
  hoisted.nextWaitlistPosition.mockResolvedValue(1);
  hoisted.sendConfirmationEmail.mockResolvedValue({ ok: true });
  hoisted.sendAdminNotificationEmail.mockResolvedValue({ ok: true });
  hoisted.sendWaitlistConfirmEmail.mockResolvedValue({ ok: true });
  hoisted.sendSubmitterSummaryEmail.mockResolvedValue({ ok: true });
});

function fd(values: Record<string, string | undefined>) {
  const f = new FormData();
  for (const [k, v] of Object.entries(values)) {
    if (v !== undefined) f.set(k, v);
  }
  return f;
}

const validSelf = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "08012345678",
  gender: "female",
  age_group: "26_35",
  track_code: "UXD",
  church: "Cement HQ",
  how_heard: "whatsapp",
};

describe("registerSelfAction", () => {
  it("returns unknown error on validation failure", async () => {
    const result = await registerSelfAction(fd({ email: "not-an-email" }));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
  });

  it("returns duplicate when the email already exists", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: { reference_number: "SKU-UXD-099" },
          error: null,
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerSelfAction(fd(validSelf));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("duplicate");
    expect(result.referenceNumber).toBe("SKU-UXD-099");
  });

  it("returns track-not-found when the chosen code isn't in v_track_capacity", async () => {
    let call = 0;
    supabase = createSupabaseMock({
      from: {
        registrations: { data: null, error: null },
        v_track_capacity: () => {
          call++;
          return { data: null, error: null };
        },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerSelfAction(fd(validSelf));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("track-not-found");
    expect(call).toBeGreaterThan(0);
  });

  it("routes a full track into the waitlist and sends waitlist email", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: null, error: null },
        v_track_capacity: { data: fixtureFullCapacityRow, error: null },
        waitlist: { data: null, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerSelfAction(fd(validSelf));

    expect(result.ok).toBe(false);
    expect(result.error).toBe("waitlisted");
    expect(hoisted.sendWaitlistConfirmEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendConfirmationEmail).not.toHaveBeenCalled();
    // verify the waitlist insert went through with our fixture
    const waitlistCall = supabase._calls.find((c) => c.table === "waitlist");
    expect(waitlistCall?.operation).toBe("insert");
    expect((waitlistCall?.payload as { track_id: string })?.track_id).toBe(
      fixtureFullCapacityRow.id,
    );
  });

  it("registers + emails + revalidates on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: (chain) => {
          // First call (dedupe select) returns no row; subsequent insert returns ref.
          const isInsert = chain.filters.some((f) => f.method === "insert");
          if (isInsert) {
            return {
              data: { reference_number: "SKU-UXD-001" },
              error: null,
            };
          }
          return { data: null, error: null };
        },
        v_track_capacity: { data: fixtureCapacityRow, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerSelfAction(fd(validSelf));

    expect(result.ok).toBe(true);
    expect(result.referenceNumber).toBe("SKU-UXD-001");
    expect(hoisted.qrDataUrl).toHaveBeenCalledWith("SKU-UXD-001");
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/skillup");
  });

  it("propagates Supabase insert errors as unknown", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: (chain) =>
          chain.filters.some((f) => f.method === "insert")
            ? { data: null, error: { message: "rls denied" } }
            : { data: null, error: null },
        v_track_capacity: { data: fixtureCapacityRow, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerSelfAction(fd(validSelf));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
    expect(result.message).toContain("rls denied");
  });
});

const validOthersPayload = {
  submitter: {
    submitter_name: "Pastor Joe",
    submitter_email: "joe@example.com",
    submitter_phone: "08012345678",
    relationship: "pastor" as const,
    church: "Cement HQ",
  },
  registrants: [
    {
      full_name: "Member One",
      phone: "08011111111",
      gender: "male" as const,
      age_group: "18_25" as const,
      track_code: "UXD",
      email: "member@example.com",
    },
  ],
};

describe("registerOthersAction", () => {
  it("returns unknown on validation failure", async () => {
    const result = await registerOthersAction({
      submitter: { ...validOthersPayload.submitter, submitter_email: "" },
      registrants: validOthersPayload.registrants,
      // biome-ignore lint/suspicious/noExplicitAny: deliberate invalid payload for test
    } as any);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
  });

  it("creates a batch + per-registrant inserts on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        batches: { data: { id: "batch-1" }, error: null },
        registrations: (chain) =>
          chain.filters.some((f) => f.method === "insert")
            ? { data: { reference_number: "SKU-UXD-007" }, error: null }
            : { data: null, error: null },
        v_track_capacity: { data: fixtureCapacityRow, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(true);
    expect(result.batchId).toBe("batch-1");
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalled(); // per-registrant
    expect(hoisted.sendSubmitterSummaryEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledOnce();
  });

  it("places registrants on the waitlist for full tracks", async () => {
    supabase = createSupabaseMock({
      from: {
        batches: { data: { id: "batch-2" }, error: null },
        registrations: { data: null, error: null },
        v_track_capacity: { data: fixtureFullCapacityRow, error: null },
        waitlist: { data: null, error: null },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(true);
    const waitlistInserts = supabase._calls.filter(
      (c) => c.table === "waitlist" && c.operation === "insert",
    );
    expect(waitlistInserts.length).toBe(1);
    // No registration inserted for this person
    const regInserts = supabase._calls.filter(
      (c) => c.table === "registrations" && c.operation === "insert",
    );
    expect(regInserts.length).toBe(0);
  });

  it("returns unknown when batch insert fails", async () => {
    supabase = createSupabaseMock({
      from: {
        batches: { data: null, error: { message: "boom" } },
      },
    });
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
  });
});
