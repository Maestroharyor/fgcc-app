import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(() => ({ mock: "route-client" })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { createSupabaseRouteClient } from "./route";

describe("createSupabaseRouteClient", () => {
  beforeEach(() => {
    createServerClientMock.mockClear();
  });

  it("returns a client wired to read + write cookies", async () => {
    const client = await createSupabaseRouteClient();
    expect(client).toEqual({ mock: "route-client" });
    const [url, key, opts] = createServerClientMock.mock
      .calls[0] as unknown as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } },
    ];
    expect(url).toBeTypeOf("string");
    expect(key).toBeTypeOf("string");
    expect(opts.cookies.setAll).toBeInstanceOf(Function);
    // No try/catch in route variant — writes must succeed unconditionally.
    expect(() => opts.cookies.setAll([])).not.toThrow();
  });
});
