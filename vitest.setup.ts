import { vi } from "vitest";

/**
 * Global mocks for every test. Files that need a different behaviour can
 * `vi.mocked(...).mockImplementation(...)` inside their own `beforeEach`.
 *
 * Convention:
 *  - `redirect(path)`  throws `RedirectError(path)`
 *  - `notFound()`      throws `NotFoundError`
 *  - `forbidden()`     throws `ForbiddenError`
 * Tests assert via `expect(fn()).rejects.toThrow(RedirectError)` or by
 * matching `err.destination`.
 */

export class RedirectError extends Error {
  constructor(public destination: string) {
    super(`REDIRECT: ${destination}`);
    this.name = "RedirectError";
  }
}

export class NotFoundError extends Error {
  constructor() {
    super("NOT_FOUND");
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  constructor() {
    super("FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// next/cache
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

// ─────────────────────────────────────────────────────────────────────────────
// next/navigation
// ─────────────────────────────────────────────────────────────────────────────
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new RedirectError(path);
  }),
  notFound: vi.fn(() => {
    throw new NotFoundError();
  }),
  forbidden: vi.fn(() => {
    throw new ForbiddenError();
  }),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// ─────────────────────────────────────────────────────────────────────────────
// next/headers — async, with an in-memory cookie + header store per test.
// Tests can grab the underlying store via vi.mocked(cookies).mock.results.
// ─────────────────────────────────────────────────────────────────────────────
interface CookieRecord {
  name: string;
  value: string;
}

export function makeCookieJar(initial: CookieRecord[] = []) {
  const map = new Map<string, string>(initial.map((c) => [c.name, c.value]));
  return {
    getAll: () =>
      Array.from(map.entries()).map(([name, value]) => ({ name, value })),
    get: (name: string) => {
      const value = map.get(name);
      return value !== undefined ? { name, value } : undefined;
    },
    set: (name: string, value: string) => {
      map.set(name, value);
    },
    delete: (name: string) => {
      map.delete(name);
    },
    has: (name: string) => map.has(name),
  };
}

const defaultJar = makeCookieJar();

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => defaultJar),
  headers: vi.fn(async () => new Headers()),
}));
