import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type ChainCall,
  createSupabaseMock,
  type MockResult,
  type SupabaseMock,
} from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const hoisted = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
  sendConfirmationEmail: vi.fn(async () => ({ ok: true })),
  sendAdminNotificationEmail: vi.fn(async () => ({ ok: true })),
  sendWaitlistConfirmEmail: vi.fn(async () => ({ ok: true })),
  sendSubmitterSummaryEmail: vi.fn(async () => ({ ok: true })),
  nextWaitlistPosition: vi.fn(async () => 1),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: hoisted.createSupabaseAdminClient,
}));

// getTrackCount (via resolveTrack → @/lib/db/tracks) still uses the server
// client, so route it to the same mock so capacity queries respond.
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: hoisted.createSupabaseServerClient,
}));

vi.mock("@/lib/email/send", () => ({
  sendConfirmationEmail: hoisted.sendConfirmationEmail,
  sendAdminNotificationEmail: hoisted.sendAdminNotificationEmail,
  sendWaitlistConfirmEmail: hoisted.sendWaitlistConfirmEmail,
  sendSubmitterSummaryEmail: hoisted.sendSubmitterSummaryEmail,
}));

vi.mock("@/lib/db/waitlist", () => ({
  nextWaitlistPosition: hoisted.nextWaitlistPosition,
}));

import { revalidatePath } from "next/cache";
import { registerOthersAction, registerSelfAction } from "./actions";

beforeEach(() => {
  vi.clearAllMocks();
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

/**
 * Build a registrations-table handler that distinguishes the three call
 * shapes the action makes:
 *   1. dedupe   - `.select("reference_number").eq("email", …).maybeSingle()`
 *   2. capacity - `.select("*", { count: "exact", head: true }).eq("track_code", …)`
 *   3. insert   - `.insert(…).select("reference_number").single()`
 */
function registrationsHandler(opts: {
  dedupe?: MockResult;
  count?: number;
  insert?: MockResult;
}): (chain: ChainCall) => MockResult {
  return (chain) => {
    if (chain.filters.some((f) => f.method === "insert")) {
      return opts.insert ?? { data: null, error: null };
    }
    const isCountQuery = chain.filters.some(
      (f) =>
        f.method === "select" &&
        (f.args[1] as { head?: boolean } | undefined)?.head === true,
    );
    if (isCountQuery) {
      return { data: null, error: null, count: opts.count ?? 0 };
    }
    return opts.dedupe ?? { data: null, error: null };
  };
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
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerSelfAction(fd(validSelf));
    expect(result.ok).toBe(false);
    expect(result.error).toBe("duplicate");
    expect(result.referenceNumber).toBe("SKU-UXD-099");
  });

  it("returns track-not-found when the chosen code isn't in the static catalogue", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: registrationsHandler({}),
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerSelfAction(
      fd({ ...validSelf, track_code: "ZZZ" }),
    );
    expect(result.ok).toBe(false);
    expect(result.error).toBe("track-not-found");
  });

  it("routes a full track into the waitlist and sends waitlist email", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: registrationsHandler({ count: 999 }),
        waitlist: { data: null, error: null },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerSelfAction(fd(validSelf));

    expect(result.ok).toBe(false);
    expect(result.error).toBe("waitlisted");
    expect(hoisted.sendWaitlistConfirmEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendConfirmationEmail).not.toHaveBeenCalled();
    const waitlistCall = supabase._calls.find((c) => c.table === "waitlist");
    expect(waitlistCall?.operation).toBe("insert");
    expect((waitlistCall?.payload as { track_code: string })?.track_code).toBe(
      "UXD",
    );
  });

  it("registers + emails + revalidates on the happy path", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: registrationsHandler({
          count: 0,
          insert: {
            data: { reference_number: "SKU-UXD-001" },
            error: null,
          },
        }),
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerSelfAction(fd(validSelf));

    expect(result.ok).toBe(true);
    expect(result.referenceNumber).toBe("SKU-UXD-001");
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith("/skillup");
  });

  it("propagates Supabase insert errors as unknown", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: registrationsHandler({
          count: 0,
          insert: { data: null, error: { message: "rls denied" } },
        }),
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
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
        registrations: registrationsHandler({
          count: 0,
          insert: {
            data: { reference_number: "SKU-UXD-007" },
            error: null,
          },
        }),
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(true);
    expect(result.batchId).toBe("batch-1");
    expect(hoisted.sendConfirmationEmail).toHaveBeenCalled();
    expect(hoisted.sendSubmitterSummaryEmail).toHaveBeenCalledOnce();
    expect(hoisted.sendAdminNotificationEmail).toHaveBeenCalledOnce();
  });

  it("places registrants on the waitlist for full tracks", async () => {
    supabase = createSupabaseMock({
      from: {
        batches: { data: { id: "batch-2" }, error: null },
        registrations: registrationsHandler({ count: 999 }),
        waitlist: { data: null, error: null },
      },
    });
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);

    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(true);
    const waitlistInserts = supabase._calls.filter(
      (c) => c.table === "waitlist" && c.operation === "insert",
    );
    expect(waitlistInserts.length).toBe(1);
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
    hoisted.createSupabaseAdminClient.mockReturnValue(supabase);
    hoisted.createSupabaseServerClient.mockResolvedValue(supabase);
    const result = await registerOthersAction(validOthersPayload);
    expect(result.ok).toBe(false);
    expect(result.error).toBe("unknown");
  });
});
