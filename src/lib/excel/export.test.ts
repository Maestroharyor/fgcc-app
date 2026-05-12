import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildXlsx, type ExcelColumn } from "./export";

interface Row {
  ref: string;
  name: string;
  attended: boolean;
}

const columns: ExcelColumn<Row>[] = [
  { header: "Ref", key: "ref", value: (r) => r.ref },
  { header: "Name", key: "name", value: (r) => r.name },
  {
    header: "Attended",
    key: "attended",
    value: (r) => (r.attended ? "Yes" : "No"),
  },
];

describe("buildXlsx", () => {
  it("returns a Buffer starting with the xlsx (zip) magic bytes", async () => {
    const buf = await buildXlsx(
      [{ ref: "SKU-UXD-001", name: "Ada", attended: true }],
      columns,
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    // ZIP signature: 50 4B 03 04
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it("writes the header row + N data rows that round-trip through ExcelJS", async () => {
    const rows = [
      { ref: "SKU-UXD-001", name: "Ada", attended: true },
      { ref: "SKU-UXD-002", name: "Babs", attended: false },
    ];
    const buf = await buildXlsx(rows, columns);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
    const sheet = wb.worksheets[0];
    expect(sheet.name).toBe("Registrations");
    // 1 header row + 2 data rows
    expect(sheet.rowCount).toBe(3);

    const header = sheet.getRow(1);
    expect(header.getCell(1).value).toBe("Ref");
    expect(header.getCell(2).value).toBe("Name");
    expect(header.getCell(3).value).toBe("Attended");

    const first = sheet.getRow(2);
    expect(first.getCell(1).value).toBe("SKU-UXD-001");
    expect(first.getCell(3).value).toBe("Yes");
  });

  it("accepts a custom sheet name", async () => {
    const buf = await buildXlsx([], columns, "Attendees");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
    expect(wb.worksheets[0].name).toBe("Attendees");
  });
});
