import { vi } from "vitest";

/**
 * Programmable Supabase JS client mock.
 *
 * Every chained method (`.select`, `.eq`, `.order`, etc.) is a recorded no-op
 * that returns the same chain. Terminal points (`await q`, `.maybeSingle()`,
 * `.single()`) resolve to whatever the test configured for that table.
 *
 * Usage:
 *
 *   const supabase = createSupabaseMock({
 *     from: {
 *       tracks: { data: [...rows], error: null },
 *       v_track_capacity: { data: [...rows], error: null },
 *     },
 *     user: { id: 'u1', email: 'a@b.c' },
 *   });
 *
 * If a test needs different results for two queries on the same table, pass a
 * function that inspects the recorded chain:
 *
 *   from: {
 *     registrations: (chain) =>
 *       chain.filters.find(f => f.method === 'eq')?.args[0] === 'email'
 *         ? { data: { reference_number: 'SKU-UXD-001' }, error: null }
 *         : { data: null, error: null },
 *   }
 */

export interface MockResult<T = unknown> {
  data?: T | null;
  error?: { message: string } | null;
  count?: number | null;
}

export interface MockUser {
  id: string;
  email?: string;
}

export interface ChainCall {
  table: string;
  filters: Array<{ method: string; args: unknown[] }>;
  operation?: "select" | "insert" | "update" | "delete" | "upsert";
  payload?: unknown;
}

export interface SupabaseMockConfig {
  from?: Record<string, MockResult | ((chain: ChainCall) => MockResult)>;
  user?: MockUser | null;
  authError?: { message: string } | null;
  exchangeError?: { message: string } | null;
}

const CHAIN_METHODS = new Set([
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "is",
  "in",
  "contains",
  "containedBy",
  "rangeLt",
  "rangeGt",
  "rangeGte",
  "rangeLte",
  "or",
  "and",
  "not",
  "filter",
  "match",
  "order",
  "limit",
  "range",
  "returns",
  "head",
  "csv",
  "abortSignal",
]);

const OPERATION_METHODS = new Set([
  "select",
  "insert",
  "update",
  "delete",
  "upsert",
]);

function buildChain(
  table: string,
  config: SupabaseMockConfig,
): ChainCall & object {
  const call: ChainCall = { table, filters: [] };

  const resolve = (): MockResult => {
    const handler = config.from?.[table];
    if (handler === undefined) {
      return { data: null, error: null };
    }
    return typeof handler === "function" ? handler(call) : handler;
  };

  const proxy: unknown = new Proxy(call, {
    get(target, prop) {
      if (
        prop === "filters" ||
        prop === "table" ||
        prop === "operation" ||
        prop === "payload"
      ) {
        return target[prop as keyof ChainCall];
      }
      if (prop === "then") {
        return (
          onFulfilled?: (value: MockResult) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) => Promise.resolve(resolve()).then(onFulfilled, onRejected);
      }
      if (prop === "maybeSingle" || prop === "single") {
        return () => Promise.resolve(resolve());
      }
      if (typeof prop !== "string") return undefined;
      if (CHAIN_METHODS.has(prop)) {
        return (...args: unknown[]) => {
          call.filters.push({ method: prop, args });
          if (OPERATION_METHODS.has(prop)) {
            call.operation = prop as ChainCall["operation"];
            if (prop === "insert" || prop === "update" || prop === "upsert") {
              call.payload = args[0];
            }
          }
          return proxy;
        };
      }
      // Unknown method — still return chainable to be tolerant.
      return (...args: unknown[]) => {
        call.filters.push({ method: prop, args });
        return proxy;
      };
    },
  });

  return proxy as ChainCall & object;
}

export interface SupabaseMock {
  from: ReturnType<typeof vi.fn>;
  auth: {
    getUser: ReturnType<typeof vi.fn>;
    getSession: ReturnType<typeof vi.fn>;
    exchangeCodeForSession: ReturnType<typeof vi.fn>;
    signInWithPassword: ReturnType<typeof vi.fn>;
    signOut: ReturnType<typeof vi.fn>;
    admin: {
      listUsers: ReturnType<typeof vi.fn>;
    };
  };
  _calls: ChainCall[];
}

export function createSupabaseMock(
  config: SupabaseMockConfig = {},
): SupabaseMock {
  const calls: ChainCall[] = [];
  return {
    from: vi.fn((table: string) => {
      const chain = buildChain(table, config);
      calls.push(chain as ChainCall);
      return chain;
    }),
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: config.user ?? null },
        error: config.authError ?? null,
      })),
      getSession: vi.fn(async () => ({
        data: { session: config.user ? { user: config.user } : null },
        error: null,
      })),
      exchangeCodeForSession: vi.fn(async () => ({
        data: { user: config.user ?? null },
        error: config.exchangeError ?? null,
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: config.user ?? null },
        error: config.authError ?? null,
      })),
      signOut: vi.fn(async () => ({ error: null })),
      admin: {
        listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
      },
    },
    _calls: calls,
  };
}

/**
 * Convenience: wires `@supabase/ssr` to return the given mock client from
 * `createServerClient` and `createBrowserClient`. Tests typically call this
 * once in a `beforeEach`.
 */
export function installSupabaseMock(mock: SupabaseMock) {
  vi.doMock("@supabase/ssr", () => ({
    createServerClient: vi.fn(() => mock),
    createBrowserClient: vi.fn(() => mock),
  }));
}
