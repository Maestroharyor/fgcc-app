import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  requireRole: vi.fn(),
  uploadSignatureImage: vi.fn(),
  upsertSignatory: vi.fn(),
}));

vi.mock("@/lib/auth/require-role", () => ({
  requireRole: hoisted.requireRole,
}));

vi.mock("@/lib/db/signatories", () => ({
  uploadSignatureImage: hoisted.uploadSignatureImage,
  upsertSignatory: hoisted.upsertSignatory,
}));

import { updateSignatory } from "./actions";

const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

function makeFormData(
  fields: Record<string, string>,
  file?: { bytes: Uint8Array<ArrayBuffer>; name?: string },
) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  if (file) {
    fd.set(
      "file",
      new File([file.bytes], file.name ?? "sig.png", { type: "image/png" }),
    );
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.requireRole.mockResolvedValue({ role: "superadmin", userId: "u1" });
  hoisted.uploadSignatureImage.mockResolvedValue({
    ok: true,
    path: "signatures/chairman.png",
  });
  hoisted.upsertSignatory.mockResolvedValue({ ok: true });
});

describe("updateSignatory", () => {
  it("requires superadmin", async () => {
    await updateSignatory(
      makeFormData({ slot: "chairman", name: "A", title: "Chairman" }),
    );
    expect(hoisted.requireRole).toHaveBeenCalledWith("superadmin");
  });

  it("rejects an unknown slot", async () => {
    const res = await updateSignatory(
      makeFormData({ slot: "treasurer", name: "A", title: "Treasurer" }),
    );
    expect(res.ok).toBe(false);
    expect(hoisted.upsertSignatory).not.toHaveBeenCalled();
  });

  it("rejects a missing title", async () => {
    const res = await updateSignatory(
      makeFormData({ slot: "chairman", name: "A", title: "" }),
    );
    expect(res.ok).toBe(false);
  });

  it("saves captions without a file", async () => {
    const res = await updateSignatory(
      makeFormData({
        slot: "convener",
        name: "Deacon B",
        title: "Programme Convener",
      }),
    );
    expect(res).toEqual({ ok: true });
    expect(hoisted.uploadSignatureImage).not.toHaveBeenCalled();
    expect(hoisted.upsertSignatory).toHaveBeenCalledWith("convener", {
      name: "Deacon B",
      title: "Programme Convener",
    });
  });

  it("uploads a PNG and stores its path", async () => {
    const res = await updateSignatory(
      makeFormData(
        { slot: "chairman", name: "Pastor A", title: "Chairman" },
        { bytes: PNG_BYTES },
      ),
    );
    expect(res).toEqual({ ok: true });
    expect(hoisted.uploadSignatureImage).toHaveBeenCalledWith(
      "chairman",
      expect.any(Buffer),
    );
    expect(hoisted.upsertSignatory).toHaveBeenCalledWith("chairman", {
      name: "Pastor A",
      title: "Chairman",
      image_path: "signatures/chairman.png",
    });
  });

  it("rejects a non-PNG file by magic bytes", async () => {
    const res = await updateSignatory(
      makeFormData(
        { slot: "chairman", name: "A", title: "Chairman" },
        { bytes: new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), name: "sig.jpg" },
      ),
    );
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/PNG/);
    expect(hoisted.uploadSignatureImage).not.toHaveBeenCalled();
  });

  it("surfaces storage failures", async () => {
    hoisted.uploadSignatureImage.mockResolvedValue({
      ok: false,
      error: "storage-not-configured",
    });
    const res = await updateSignatory(
      makeFormData(
        { slot: "chairman", name: "A", title: "Chairman" },
        { bytes: PNG_BYTES },
      ),
    );
    expect(res).toEqual({ ok: false, error: "storage-not-configured" });
    expect(hoisted.upsertSignatory).not.toHaveBeenCalled();
  });
});
