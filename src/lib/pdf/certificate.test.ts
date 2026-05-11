import { describe, expect, it } from "vitest";
import { buildCertificate } from "./certificate";

describe("buildCertificate", () => {
  it("renders a PDF buffer with the magic header", async () => {
    const buf = await buildCertificate({
      fullName: "Ada Lovelace",
      trackName: "UI/UX Design",
      referenceNumber: "SKU-UXD-001",
      facilitatorName: "Ayomide Odewale",
    });
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("survives an exceptionally long name (auto-size kicks in)", async () => {
    const longName =
      "Augustus Maximilian Bartholomew Fitzgerald-Pennington III";
    const buf = await buildCertificate({
      fullName: longName,
      trackName: "Coding & Web Development",
      referenceNumber: "SKU-CWD-042",
      facilitatorName: null,
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("works without a facilitator name", async () => {
    const buf = await buildCertificate({
      fullName: "Test User",
      trackName: "Soap Making",
      referenceNumber: "SKU-SPM-001",
    });
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });
});
