import ExcelJS from "exceljs";

export interface ExcelColumn<T> {
  header: string;
  key: string;
  width?: number;
  value: (row: T) => string | number | boolean | Date | null;
}

export async function buildXlsx<T>(
  rows: T[],
  columns: ExcelColumn<T>[],
  sheetName = "Registrations",
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SkillUp 1.0";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet(sheetName);

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? Math.max(12, c.header.length + 2),
  }));

  // Header styling - Foursquare blue
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF003DA5" },
  };
  headerRow.alignment = { vertical: "middle", horizontal: "left" };
  headerRow.height = 22;
  sheet.views = [{ state: "frozen", ySplit: 1 }];

  for (const row of rows) {
    const record: Record<string, unknown> = {};
    for (const col of columns) {
      record[col.key] = col.value(row);
    }
    sheet.addRow(record);
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
