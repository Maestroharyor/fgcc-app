import { vi } from "vitest";

/**
 * Spy on the Resend client. Returns the mock fn so tests can assert calls and
 * tweak the response per scenario.
 */
export function createResendMock(
  result: { data?: unknown; error?: { message: string } | null } = {
    data: { id: "msg_test" },
    error: null,
  },
) {
  const send = vi.fn(async () => result);
  const Resend = vi.fn().mockImplementation(() => ({
    emails: { send },
  }));
  return { Resend, send };
}
