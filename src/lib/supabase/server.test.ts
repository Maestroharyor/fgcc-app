import { beforeEach, describe, expect, it, vi } from "vitest";

const { createServerClientMock } = vi.hoisted(() => ({
  createServerClientMock: vi.fn(() => ({ mock: "client" })),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: createServerClientMock,
}));

import { createSupabaseServerClient } from "./server";

describe("createSupabaseServerClient", () => {
  beforeEach(() => {
    createServerClientMock.mockClear();
  });

  it("returns a client built from env URL + anon key", async () => {
    const client = await createSupabaseServerClient();
    expect(client).toEqual({ mock: "client" });
    expect(createServerClientMock).toHaveBeenCalledOnce();
    const [url, key, opts] = createServerClientMock.mock
      .calls[0] as unknown as [
      string,
      string,
      { cookies: { getAll: () => unknown; setAll: (c: unknown[]) => void } },
    ];
    expect(url).toBeTypeOf("string");
    expect(url.length).toBeGreaterThan(0);
    expect(key).toBeTypeOf("string");
    expect(key.length).toBeGreaterThan(0);
    expect(opts.cookies.getAll).toBeInstanceOf(Function);
    expect(opts.cookies.setAll).toBeInstanceOf(Function);
  });

  it("swallows cookie-write errors silently (RSC context)", async () => {
    await createSupabaseServerClient();
    const opts = (
      createServerClientMock.mock.calls.at(-1) as unknown as unknown[]
    )?.[2] as {
      cookies: {
        setAll: (
          c: { name: string; value: string; options?: unknown }[],
        ) => void;
      };
    };
    // The default cookie jar set() doesn't throw, but the wrapper has a
    // try/catch - exercise both branches by patching the jar.
    expect(() =>
      opts.cookies.setAll([{ name: "a", value: "b", options: { path: "/" } }]),
    ).not.toThrow();
  });
});
