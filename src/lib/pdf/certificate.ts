import { jsPDF } from "jspdf";
import { qrPngBuffer } from "@/lib/qr/generate";

export interface CertificateInput {
  fullName: string;
  trackName: string;
  referenceNumber: string;
  facilitatorName?: string | null;
}

const PRIMARY = "#003DA5";
const GOLD = "#F59E0B";
const NAVY = "#0F172A";
const MUTED = "#64748B";

export async function buildCertificate({
  fullName,
  trackName,
  referenceNumber,
  facilitatorName,
}: CertificateInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top blue band
  doc.setFillColor(PRIMARY);
  doc.rect(0, 0, pageWidth, 26, "F");

  // Gold accent strip
  doc.setFillColor(GOLD);
  doc.rect(0, 26, pageWidth, 2, "F");

  // Header text
  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("SKILLUP 1.0", 18, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Foursquare Gospel Church · Cement Missionary HQ", 18, 18);

  doc.setTextColor("#FFFFFF");
  doc.setFontSize(9);
  doc.text("June 12 – 14, 2026", pageWidth - 18, 18, { align: "right" });

  // Body
  doc.setTextColor(MUTED);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("Certificate of Participation", pageWidth / 2, 50, {
    align: "center",
  });

  doc.setTextColor(NAVY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("This is to certify that", pageWidth / 2, 65, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(autoSize(fullName));
  doc.setTextColor(PRIMARY);
  doc.text(fullName, pageWidth / 2, 82, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.text(
    "successfully participated in the SkillUp 1.0 programme,",
    pageWidth / 2,
    97,
    { align: "center" },
  );
  doc.text(
    "completing three days of practical training in:",
    pageWidth / 2,
    104,
    {
      align: "center",
    },
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(NAVY);
  doc.text(trackName, pageWidth / 2, 122, { align: "center" });

  // Signature line
  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.4);
  doc.line(pageWidth / 2 - 50, 160, pageWidth / 2 + 50, 160);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(facilitatorName ?? "Lead Facilitator", pageWidth / 2, 166, {
    align: "center",
  });
  doc.text("Facilitator", pageWidth / 2, 171, { align: "center" });

  // Reference + QR (bottom right)
  try {
    const qr = await qrPngBuffer(referenceNumber, { width: 220 });
    doc.addImage(qr, "PNG", pageWidth - 50, pageHeight - 50, 32, 32);
  } catch {
    // ignore — certificate still valid without QR.
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(`Reference: ${referenceNumber}`, pageWidth - 50, pageHeight - 14, {
    align: "left",
  });

  // Bottom strip
  doc.setFillColor(GOLD);
  doc.rect(0, pageHeight - 4, pageWidth, 4, "F");

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

function autoSize(name: string): number {
  if (name.length > 38) return 22;
  if (name.length > 28) return 28;
  return 36;
}
