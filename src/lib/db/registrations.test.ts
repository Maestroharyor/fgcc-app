import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fixtureAttendedRegistration,
  fixtureRegistration,
} from "@/test/fixtures/tracks";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;
const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient,
}));

beforeEach(() => {
  supabase = createSupabaseMock();
  createSupabaseServerClient.mockImplementation(async () => supabase);
});

describe("getRegistrationByReference", () => {
  it("returns the row when found (uppercases ref)", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: fixtureRegistration, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getRegistrationByReference } = await import("./registrations");
    const result = await getRegistrationByReference("sku-uxd-001");
    expect(result?.id).toBe(fixtureRegistration.id);
    const call = supabase._calls.at(-1);
    const eq = call?.filters.find((f) => f.method === "eq");
    expect(eq?.args).toEqual(["reference_number", "SKU-UXD-001"]);
  });

  it("returns null when not found", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getRegistrationByReference } = await import("./registrations");
    expect(await getRegistrationByReference("missing")).toBeNull();
  });
});

describe("getRegistrationByEmail", () => {
  it("lowercases email and queries", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: fixtureRegistration, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getRegistrationByEmail } = await import("./registrations");
    const result = await getRegistrationByEmail("JOHN@example.com");
    expect(result?.email).toBe("john@example.com");
    const eq = supabase._calls.at(-1)?.filters.find((f) => f.method === "eq");
    expect(eq?.args).toEqual(["email", "john@example.com"]);
  });

  it("returns null on error", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: null, error: { message: "boom" } },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getRegistrationByEmail } = await import("./registrations");
    expect(await getRegistrationByEmail("x@y.z")).toBeNull();
  });
});

describe("getRegistrationById", () => {
  it("returns the row by id", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: fixtureRegistration, error: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getRegistrationById } = await import("./registrations");
    expect((await getRegistrationById("reg-1"))?.id).toBe("reg-1");
  });
});

describe("listRegistrations", () => {
  it("returns rows + total + paging metadata", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [fixtureRegistration],
          error: null,
          count: 1,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listRegistrations } = await import("./registrations");
    const result = await listRegistrations({ page: 1, pageSize: 50 });
    expect(result.rows).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("applies q/trackCode/type/attended filters", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: [], error: null, count: 0 },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listRegistrations } = await import("./registrations");
    await listRegistrations({
      query: "John",
      trackCode: "uxd",
      type: "self",
      attended: true,
      page: 2,
      pageSize: 25,
    });
    const filters = supabase._calls.at(-1)?.filters ?? [];
    expect(filters.some((f) => f.method === "or")).toBe(true);
    const eqs = filters.filter((f) => f.method === "eq");
    expect(
      eqs.some((f) => f.args[0] === "track_code" && f.args[1] === "UXD"),
    ).toBe(true);
    expect(
      eqs.some((f) => f.args[0] === "registered_via" && f.args[1] === "self"),
    ).toBe(true);
    expect(
      eqs.some((f) => f.args[0] === "attended" && f.args[1] === true),
    ).toBe(true);
    const range = filters.find((f) => f.method === "range");
    expect(range?.args).toEqual([25, 49]);
  });

  it("applies the certificateSent filter in both directions", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: [], error: null, count: 0 } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listRegistrations } = await import("./registrations");

    await listRegistrations({ certificateSent: true });
    let filters = supabase._calls.at(-1)?.filters ?? [];
    expect(
      filters.some(
        (f) => f.method === "not" && f.args[0] === "certificate_sent_at",
      ),
    ).toBe(true);

    await listRegistrations({ certificateSent: false });
    filters = supabase._calls.at(-1)?.filters ?? [];
    expect(
      filters.some(
        (f) =>
          f.method === "is" &&
          f.args[0] === "certificate_sent_at" &&
          f.args[1] === null,
      ),
    ).toBe(true);
  });

  it("returns empty page when query errors out", async () => {
    supabase = createSupabaseMock({
      from: {
        registrations: { data: null, error: { message: "boom" }, count: null },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { listRegistrations } = await import("./registrations");
    const result = await listRegistrations();
    expect(result.rows).toEqual([]);
    expect(result.total).toBe(0);
  });
});

describe("getAttendanceBoard", () => {
  it("returns the mapped rows", async () => {
    vi.resetModules();
    supabase = createSupabaseMock({
      from: {
        registrations: {
          data: [
            {
              id: "r1",
              reference_number: "SKU-UXD-001",
              full_name: "Ada",
              track_code: "UXD",
              attended: true,
              attended_at: "2026-06-12T08:00:00.000Z",
            },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getAttendanceBoard } = await import("./registrations");
    const rows = await getAttendanceBoard();
    expect(rows).toHaveLength(1);
    expect(rows[0].reference_number).toBe("SKU-UXD-001");
    expect(rows[0].attended).toBe(true);
  });

  it("returns [] on error", async () => {
    vi.resetModules();
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: { message: "boom" } } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getAttendanceBoard } = await import("./registrations");
    expect(await getAttendanceBoard()).toEqual([]);
  });
});

describe("countAttended", () => {
  it("returns the count from Supabase", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null, count: 12 } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { countAttended } = await import("./registrations");
    expect(await countAttended()).toBe(12);
  });

  it("returns 0 when count is null", async () => {
    supabase = createSupabaseMock({
      from: { registrations: { data: null, error: null, count: null } },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { countAttended } = await import("./registrations");
    expect(await countAttended()).toBe(0);
  });
});

// Reference fixture used to silence the unused-import lint when this file
// runs on its own - but it's also valid data per the suite.
void fixtureAttendedRegistration;
