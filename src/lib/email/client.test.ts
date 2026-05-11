import { beforeEach, describe, expect, it, vi } from "vitest";

describe("email client", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("isEmailConfigured() reflects RESEND_API_KEY presence", async () => {
    vi.doMock("@/lib/utils/env", () => ({
      env: { RESEND_API_KEY: "re_test_x" },
    }));
    const mod = await import("./client");
    expect(mod.isEmailConfigured()).toBe(true);
  });

  it("isEmailConfigured() returns false when key absent", async () => {
    vi.doMock("@/lib/utils/env", () => ({ env: { RESEND_API_KEY: "" } }));
    const mod = await import("./client");
    expect(mod.isEmailConfigured()).toBe(false);
  });

  it("resendClient() throws a clear error when key missing", async () => {
    vi.doMock("@/lib/utils/env", () => ({ env: { RESEND_API_KEY: "" } }));
    const mod = await import("./client");
    expect(() => mod.resendClient()).toThrow(
      /RESEND_API_KEY is not configured/,
    );
  });

  it("resendClient() caches the instance across calls", async () => {
    const ctorCalls: unknown[] = [];
    class FakeResend {
      emails = { send: vi.fn() };
      constructor(key: string) {
        ctorCalls.push(key);
      }
    }
    vi.doMock("resend", () => ({ Resend: FakeResend }));
    vi.doMock("@/lib/utils/env", () => ({
      env: { RESEND_API_KEY: "re_test_x" },
    }));
    const mod = await import("./client");
    const a = mod.resendClient();
    const b = mod.resendClient();
    expect(a).toBe(b);
    expect(ctorCalls).toHaveLength(1);
    expect(ctorCalls[0]).toBe("re_test_x");
  });
});
