import { jsPDF } from "jspdf";

export interface PdfColumn<T> {
  header: string;
  width: number; // mm
  value: (row: T) => string;
}

export function buildPrintableList<T>(
  title: string,
  subtitle: string,
  rows: T[],
  columns: PdfColumn<T>[],
): Buffer {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor("#0F172A");
  doc.text(title, margin, margin + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor("#64748B");
  doc.text(subtitle, margin, margin + 11);

  let y = margin + 18;
  drawHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor("#0F172A");

  for (const row of rows) {
    if (y > pageHeight - margin - 8) {
      doc.addPage();
      y = margin + 6;
      drawHeader();
    }
    let x = margin;
    for (const col of columns) {
      const value = col.value(row);
      doc.text(truncate(value, Math.floor(col.width * 1.8)), x + 1, y + 4.5);
      x += col.width;
    }
    doc.setDrawColor("#E2E8F0");
    doc.line(margin, y + 6, pageWidth - margin, y + 6);
    y += 7;
  }

  function drawHeader() {
    doc.setFillColor("#003DA5");
    doc.rect(margin, y, pageWidth - margin * 2, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor("#FFFFFF");
    let x = margin;
    for (const col of columns) {
      doc.text(col.header, x + 1, y + 4.7);
      x += col.width;
    }
    y += 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor("#0F172A");
  }

  function truncate(value: string, max: number): string {
    return value.length > max ? `${value.slice(0, max - 1)}…` : value;
  }

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
