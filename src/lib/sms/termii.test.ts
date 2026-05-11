import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { normaliseNigerianPhone, sendBulkSMS, sendSMS } from "./termii";

vi.mock("@/lib/utils/env", () => ({
  env: {
    TERMII_API_KEY: "termii_test_x",
    TERMII_SENDER_ID: "SKILLUP",
  },
}));

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.clearAllMocks();
});

describe("normaliseNigerianPhone", () => {
  it("strips spaces, dashes, parens", () => {
    expect(normaliseNigerianPhone("(080) 1234-5678")).toBe("+2348012345678");
    expect(normaliseNigerianPhone("0801 234 5678")).toBe("+2348012345678");
  });

  it("rewrites a local 0… number to +234…", () => {
    expect(normaliseNigerianPhone("08012345678")).toBe("+2348012345678");
  });

  it("preserves an already +234-prefixed number", () => {
    expect(normaliseNigerianPhone("+2348012345678")).toBe("+2348012345678");
  });

  it("preserves 234-without-plus by adding the plus", () => {
    expect(normaliseNigerianPhone("2348012345678")).toBe("+2348012345678");
  });

  it("leaves international numbers untouched", () => {
    expect(normaliseNigerianPhone("+15551234567")).toBe("+15551234567");
  });
});

describe("sendSMS", () => {
  it("returns ok:false when TERMII_API_KEY is missing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/utils/env", () => ({
      env: { TERMII_API_KEY: "", TERMII_SENDER_ID: "SKILLUP" },
    }));
    const mod = await import("./termii");
    const result = await mod.sendSMS({ to: "08012345678", message: "hi" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("termii-not-configured");
  });

  it("POSTs the documented payload to Termii and returns ok on success", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message_id: "abc" }), { status: 200 }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await sendSMS({
      to: "08012345678",
      message: "Welcome to SkillUp",
    });
    expect(result.ok).toBe(true);
    expect(result.message_id).toBe("abc");
    const call = fetchMock.mock.calls[0];
    const [url, init] = call as [string, RequestInit];
    expect(url).toBe("https://api.termii.com/api/sms/send");
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({
      to: "+2348012345678",
      from: "SKILLUP",
      sms: "Welcome to SkillUp",
      type: "plain",
      channel: "generic",
      api_key: "termii_test_x",
    });
  });

  it("returns ok:false with the body's message on non-2xx", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ message: "insufficient balance" }), {
          status: 402,
        }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    const result = await sendSMS({ to: "+234", message: "hi" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("insufficient balance");
  });

  it("catches network errors", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const result = await sendSMS({ to: "+234", message: "hi" });
    expect(result.ok).toBe(false);
    expect(result.message).toBe("ECONNREFUSED");
  });
});

describe("sendBulkSMS", () => {
  beforeEach(() => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ message_id: "abc" }), { status: 200 }),
    ) as unknown as typeof fetch;
  });

  it("chunks recipients in groups and returns one result per recipient", async () => {
    const recipients = Array.from({ length: 5 }, (_, i) => ({
      to: `0801234${String(i).padStart(4, "0")}`,
      message: "ping",
    }));
    const results = await sendBulkSMS(recipients, {
      batchSize: 2,
      delayMs: 0,
    });
    expect(results).toHaveLength(5);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(
      (global.fetch as unknown as { mock: { calls: unknown[] } }).mock.calls
        .length,
    ).toBe(5);
  });
});
