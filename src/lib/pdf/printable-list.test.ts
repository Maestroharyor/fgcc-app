import { describe, expect, it } from "vitest";
import { buildPrintableList, type PdfColumn } from "./printable-list";

interface Row {
  ref: string;
  name: string;
}

const columns: PdfColumn<Row>[] = [
  { header: "Ref", width: 30, value: (r) => r.ref },
  { header: "Name", width: 60, value: (r) => r.name },
];

describe("buildPrintableList", () => {
  it("returns a Buffer with the PDF magic header", () => {
    const buf = buildPrintableList(
      "SkillUp test",
      "snapshot",
      [{ ref: "SKU-UXD-001", name: "Test User" }],
      columns,
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("handles many rows without throwing (multi-page)", () => {
    const rows = Array.from({ length: 80 }, (_, i) => ({
      ref: `SKU-UXD-${String(i + 1).padStart(3, "0")}`,
      name: `Person ${i + 1}`,
    }));
    const buf = buildPrintableList("SkillUp", "multi page", rows, columns);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });

  it("handles zero rows", () => {
    const buf = buildPrintableList("SkillUp", "empty", [], columns);
    expect(buf.slice(0, 5).toString()).toBe("%PDF-");
  });
});
