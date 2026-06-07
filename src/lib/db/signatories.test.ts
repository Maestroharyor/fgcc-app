import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock, type SupabaseMock } from "@/test/mocks/supabase";

let supabase: SupabaseMock;

const { createSupabaseServerClient, createSupabaseAdminClient } = vi.hoisted(
  () => ({
    createSupabaseServerClient: vi.fn(),
    createSupabaseAdminClient: vi.fn(),
  }),
);

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));
vi.mock("@/lib/supabase/admin", () => ({ createSupabaseAdminClient }));

interface StorageMocks {
  upload: ReturnType<typeof vi.fn>;
  download: ReturnType<typeof vi.fn>;
  createSignedUrl: ReturnType<typeof vi.fn>;
}

function adminClientWithStorage(storage: Partial<StorageMocks> = {}) {
  const mock = createSupabaseMock();
  const bucket: StorageMocks = {
    upload: storage.upload ?? vi.fn(async () => ({ error: null })),
    download:
      storage.download ?? vi.fn(async () => ({ data: null, error: null })),
    createSignedUrl:
      storage.createSignedUrl ??
      vi.fn(async () => ({ data: null, error: null })),
  };
  return {
    client: Object.assign(mock, { storage: { from: vi.fn(() => bucket) } }),
    bucket,
  };
}

beforeEach(() => {
  vi.resetModules();
  supabase = createSupabaseMock();
  createSupabaseServerClient.mockImplementation(async () => supabase);
  createSupabaseAdminClient.mockImplementation(
    () => adminClientWithStorage().client,
  );
});

describe("getSignatories", () => {
  it("returns rows ordered chairman → convener", async () => {
    supabase = createSupabaseMock({
      from: {
        certificate_signatories: {
          data: [
            {
              slot: "convener",
              name: "B",
              title: "Programme Convener",
              image_path: null,
              updated_at: "",
            },
            {
              slot: "chairman",
              name: "A",
              title: "Chairman",
              image_path: "signatures/chairman.png",
              updated_at: "",
            },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getSignatories } = await import("./signatories");
    const rows = await getSignatories();
    expect(rows.map((r) => r.slot)).toEqual(["chairman", "convener"]);
  });

  it("falls back to seeded defaults on error", async () => {
    supabase = createSupabaseMock({
      from: {
        certificate_signatories: { data: null, error: { message: "boom" } },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const { getSignatories } = await import("./signatories");
    const rows = await getSignatories();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      slot: "chairman",
      title: "Chairman, Planning Committee",
      image_path: null,
    });
  });
});

describe("upsertSignatory", () => {
  it("upserts via the admin client", async () => {
    const { client } = adminClientWithStorage();
    createSupabaseAdminClient.mockImplementation(() => client);
    const { upsertSignatory } = await import("./signatories");
    const res = await upsertSignatory("chairman", {
      name: "Pastor A",
      title: "Chairman",
      image_path: "signatures/chairman.png",
    });
    expect(res.ok).toBe(true);
    const call = client._calls.find(
      (c) => c.table === "certificate_signatories",
    );
    expect(call?.operation).toBe("upsert");
    expect(call?.payload).toMatchObject({
      slot: "chairman",
      name: "Pastor A",
      image_path: "signatures/chairman.png",
    });
  });

  it("returns storage-not-configured when the admin client throws", async () => {
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error("Missing required environment variable");
    });
    const { upsertSignatory } = await import("./signatories");
    const res = await upsertSignatory("convener", {
      name: "",
      title: "Programme Convener",
    });
    expect(res).toEqual({ ok: false, error: "storage-not-configured" });
  });
});

describe("uploadSignatureImage", () => {
  it("uploads to a fixed per-slot path", async () => {
    const { client, bucket } = adminClientWithStorage();
    createSupabaseAdminClient.mockImplementation(() => client);
    const { uploadSignatureImage } = await import("./signatories");
    const res = await uploadSignatureImage("convener", Buffer.from("png"));
    expect(res).toEqual({ ok: true, path: "signatures/convener.png" });
    expect(bucket.upload).toHaveBeenCalledWith(
      "signatures/convener.png",
      expect.any(Buffer),
      { contentType: "image/png", upsert: true },
    );
  });

  it("surfaces upload errors", async () => {
    const { client } = adminClientWithStorage({
      upload: vi.fn(async () => ({ error: { message: "denied" } })),
    });
    createSupabaseAdminClient.mockImplementation(() => client);
    const { uploadSignatureImage } = await import("./signatories");
    const res = await uploadSignatureImage("chairman", Buffer.from("png"));
    expect(res).toEqual({ ok: false, error: "denied" });
  });
});

describe("loadCertificateSignatories", () => {
  it("downloads images for rows that have one", async () => {
    supabase = createSupabaseMock({
      from: {
        certificate_signatories: {
          data: [
            {
              slot: "chairman",
              name: "A",
              title: "Chairman",
              image_path: "signatures/chairman.png",
              updated_at: "",
            },
            {
              slot: "convener",
              name: "B",
              title: "Convener",
              image_path: null,
              updated_at: "",
            },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    const pngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const { client } = adminClientWithStorage({
      download: vi.fn(async () => ({
        data: new Blob([new Uint8Array(pngBytes)]),
        error: null,
      })),
    });
    createSupabaseAdminClient.mockImplementation(() => client);
    const { loadCertificateSignatories } = await import("./signatories");
    const result = await loadCertificateSignatories();
    expect(result).toHaveLength(2);
    expect(result[0].image).toBeInstanceOf(Buffer);
    expect(result[1].image).toBeNull();
  });

  it("degrades to null images when storage is unavailable", async () => {
    supabase = createSupabaseMock({
      from: {
        certificate_signatories: {
          data: [
            {
              slot: "chairman",
              name: "A",
              title: "Chairman",
              image_path: "signatures/chairman.png",
              updated_at: "",
            },
          ],
          error: null,
        },
      },
    });
    createSupabaseServerClient.mockImplementation(async () => supabase);
    createSupabaseAdminClient.mockImplementation(() => {
      throw new Error("no env");
    });
    const { loadCertificateSignatories } = await import("./signatories");
    const result = await loadCertificateSignatories();
    expect(result[0].image).toBeNull();
  });
});
