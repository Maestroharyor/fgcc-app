import { describe, expect, it } from "vitest";
import { qrPngBuffer } from "@/lib/qr/generate";
import { buildCertificate } from "./certificate";

describe("buildCertificate", () => {
  it("renders a PDF buffer with the magic header", async () => {
    const buf = await buildCertificate({
      fullName: "Ada Lovelace",
      trackName: "UI/UX Design",
      referenceNumber: "SKU-UXD-001",
      signatories: [
        { name: "Pastor A", title: "Chairman, Planning Committee" },
        { name: "Deacon B", title: "Programme Convener" },
      ],
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("survives an exceptionally long name (fit-to-width kicks in)", async () => {
    const longName =
      "Augustus Maximilian Bartholomew Fitzgerald-Pennington III";
    const buf = await buildCertificate({
      fullName: longName,
      trackName: "Coding & Web Development",
      referenceNumber: "SKU-CWD-042",
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("works without signatories", async () => {
    const buf = await buildCertificate({
      fullName: "Test User",
      trackName: "Soap Making",
      referenceNumber: "SKU-SPM-001",
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("embeds signature images when provided", async () => {
    const png = await qrPngBuffer("signature", { width: 64 });
    const buf = await buildCertificate({
      fullName: "Test User",
      trackName: "Photography",
      referenceNumber: "SKU-PHO-002",
      signatories: [
        { name: "Pastor A", title: "Chairman", image: png },
        { name: "", title: "Programme Convener", image: null },
      ],
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("ignores invalid signature image data", async () => {
    const buf = await buildCertificate({
      fullName: "Test User",
      trackName: "Photography",
      referenceNumber: "SKU-PHO-003",
      signatories: [
        { name: "Pastor A", title: "Chairman", image: Buffer.from("not-png") },
      ],
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });
});
