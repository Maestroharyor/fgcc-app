import { describe, expect, it } from "vitest";
import { qrDataUrl, qrPngBuffer } from "./generate";

describe("qrDataUrl", () => {
  it("returns a base64 PNG data URL", async () => {
    const url = await qrDataUrl("SKU-UXD-001");
    expect(url.startsWith("data:image/png;base64,")).toBe(true);
    expect(url.length).toBeGreaterThan(200);
  });

  it("honours the width option (different sizes produce different output)", async () => {
    const small = await qrDataUrl("SKU-UXD-001", { width: 100 });
    const large = await qrDataUrl("SKU-UXD-001", { width: 500 });
    expect(small).not.toBe(large);
  });
});

describe("qrPngBuffer", () => {
  it("returns a Buffer starting with the PNG signature", async () => {
    const buf = await qrPngBuffer("SKU-UXD-001");
    expect(Buffer.isBuffer(buf)).toBe(true);
    // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
    expect(buf[0]).toBe(0x89);
    expect(buf[1]).toBe(0x50);
    expect(buf[2]).toBe(0x4e);
    expect(buf[3]).toBe(0x47);
  });
});
