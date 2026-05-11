import { vi } from "vitest";

/**
 * Install a fetch mock that responds to Termii's send endpoint. Other URLs
 * fall through to the previous implementation (or fail loudly).
 */
export function mockTermiiFetch(
  result: { ok: boolean; body?: Record<string, unknown> } = {
    ok: true,
    body: { message_id: "tmsg_test" },
  },
) {
  const original = global.fetch;
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("api.termii.com/api/sms/send")) {
      return new Response(JSON.stringify(result.body ?? {}), {
        status: result.ok ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (original) return original(input);
    return new Response(null, { status: 404 });
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return {
    fetchMock,
    restore: () => {
      global.fetch = original;
    },
  };
}
