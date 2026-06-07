import { jsPDF } from "jspdf";
import {
  registerCertificateFonts,
  SCRIPT_FONT,
  SERIF_FONT,
} from "@/lib/pdf/fonts";
import { qrPngBuffer } from "@/lib/qr/generate";

export interface CertificateSignatory {
  name: string;
  title: string;
  /** Signature PNG; rendered above the line when present. */
  image?: Buffer | null;
}

export interface CertificateInput {
  fullName: string;
  trackName: string;
  referenceNumber: string;
  /** Chairman + convener blocks, left to right. */
  signatories?: CertificateSignatory[];
}

const PRIMARY = "#003DA5";
const NAVY = "#0F172A";
const MUTED = "#64748B";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E3C766";
const GOLD_DARK = "#8A6D14";
const PAGE_BG = "#F7F8FC";
const PATTERN = "#E7EBF5";

const EVENT_DATES = "June 12 – 14, 2026";
const VENUE = "Cement Missionary Headquarters, Lagos";

export async function buildCertificate({
  fullName,
  trackName,
  referenceNumber,
  signatories = [],
}: CertificateInput): Promise<Buffer> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "landscape" });
  registerCertificateFonts(doc);
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const CX = W / 2;

  // ── Background ────────────────────────────────────────────────────────────
  doc.setFillColor(PAGE_BG);
  doc.rect(0, 0, W, H, "F");
  drawDiamondPattern(doc, W, H);

  // Thin gold frame.
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, W - 22, H - 22, "S");

  drawCornerGeometry(doc, W, H);
  drawSeal(doc, W - 50, 52);

  // ── Title ─────────────────────────────────────────────────────────────────
  doc.setFont(SERIF_FONT, "bold");
  doc.setFontSize(36);
  doc.setTextColor(PRIMARY);
  centeredSpaced(doc, "CERTIFICATE", CX, 46, 2.4);

  doc.setFontSize(13);
  doc.setTextColor(NAVY);
  centeredSpaced(doc, "OF PARTICIPATION", CX, 56, 2.2);

  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.3);
  doc.line(CX - 44, 60, CX + 44, 60);

  // ── Presented to ──────────────────────────────────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(NAVY);
  doc.text("This certificate is proudly presented to", CX, 72, {
    align: "center",
  });

  // Name — script font, fitted to the column.
  const nameSize = fitFontSize(
    doc,
    fullName,
    SCRIPT_FONT,
    "normal",
    168,
    40,
    22,
  );
  doc.setFont(SCRIPT_FONT, "normal");
  doc.setFontSize(nameSize);
  doc.setTextColor(GOLD_DARK);
  doc.text(fullName, CX, 93, { align: "center" });

  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(CX - 85, 98, CX + 85, 98);

  // ── Track + body copy ─────────────────────────────────────────────────────
  const trackLine = `For completing the ${trackName} track`;
  const trackSize = fitFontSize(
    doc,
    trackLine,
    SERIF_FONT,
    "bold",
    180,
    15,
    11,
  );
  doc.setFont(SERIF_FONT, "bold");
  doc.setFontSize(trackSize);
  doc.setTextColor(NAVY);
  doc.text(trackLine, CX, 110, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED);
  const body =
    "In recognition of three days of hands-on practical training at SkillUp 1.0, " +
    "hosted by Foursquare Gospel Church, Cement Missionary Headquarters.";
  const wrapped = doc.splitTextToSize(body, 170) as string[];
  doc.text(wrapped, CX, 119, { align: "center", lineHeightFactor: 1.5 });

  // ── Signature blocks + centred date ───────────────────────────────────────
  const [left, right] = [signatories[0], signatories[1]];
  if (left) drawSignatureBlock(doc, left, 80, 166);
  if (right) drawSignatureBlock(doc, right, W - 80, 166);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text(EVENT_DATES, CX, 167, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(MUTED);
  doc.text(VENUE, CX, 172, { align: "center" });

  // ── QR + reference (bottom left, inside the frame) ────────────────────────
  try {
    const qr = await qrPngBuffer(referenceNumber, { width: 220 });
    doc.addImage(qr, "PNG", 15, H - 36, 19, 19);
  } catch {
    // ignore - certificate still valid without QR.
  }
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  doc.text(`Ref: ${referenceNumber}`, 15.5, H - 13.5);

  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

/** Center text with manual letter-spacing (jsPDF's `align` ignores charSpace). */
function centeredSpaced(
  doc: jsPDF,
  text: string,
  cx: number,
  y: number,
  charSpace: number,
): void {
  const width =
    doc.getTextWidth(text) + charSpace * Math.max(text.length - 1, 0);
  doc.text(text, cx - width / 2, y, { charSpace });
}

/** Largest font size (pt) at which `text` fits within `maxWidth` mm. */
function fitFontSize(
  doc: jsPDF,
  text: string,
  font: string,
  style: string,
  maxWidth: number,
  startPt: number,
  minPt: number,
): number {
  doc.setFont(font, style);
  let size = startPt;
  while (size > minPt) {
    doc.setFontSize(size);
    if (doc.getTextWidth(text) <= maxWidth) break;
    size -= 1;
  }
  return size;
}

function polygon(
  doc: jsPDF,
  pts: Array<[number, number]>,
  color: string,
): void {
  doc.setFillColor(color);
  const [first, ...rest] = pts;
  const segments = rest.map((p, i) => {
    const prev = i === 0 ? first : rest[i - 1];
    return [p[0] - prev[0], p[1] - prev[1]];
  });
  doc.lines(segments, first[0], first[1], [1, 1], "F", true);
}

/** Sparse grid of tiny diamonds, offset every other row. */
function drawDiamondPattern(doc: jsPDF, w: number, h: number): void {
  const step = 22;
  const r = 1.5;
  doc.setFillColor(PATTERN);
  let row = 0;
  for (let y = 20; y < h - 14; y += step / 2) {
    const offset = row % 2 === 0 ? 0 : step / 2;
    for (let x = 20 + offset; x < w - 14; x += step) {
      polygon(
        doc,
        [
          [x, y - r],
          [x + r, y],
          [x, y + r],
          [x - r, y],
        ],
        PATTERN,
      );
    }
    row += 1;
  }
}

/** Layered blue/gold triangles in the top-left and bottom-right corners. */
function drawCornerGeometry(doc: jsPDF, w: number, h: number): void {
  // Top-left cluster.
  polygon(
    doc,
    [
      [0, 0],
      [100, 0],
      [0, 88],
    ],
    GOLD,
  );
  polygon(
    doc,
    [
      [0, 0],
      [91, 0],
      [0, 80],
    ],
    PRIMARY,
  );
  polygon(
    doc,
    [
      [0, 92],
      [34, 116],
      [0, 140],
    ],
    PRIMARY,
  );
  polygon(
    doc,
    [
      [14, 98],
      [26, 106],
      [14, 114],
    ],
    GOLD,
  );
  polygon(
    doc,
    [
      [30, 128],
      [40, 134],
      [30, 140],
    ],
    PRIMARY,
  );

  // Bottom-right cluster (mirrored).
  polygon(
    doc,
    [
      [w, h],
      [w - 100, h],
      [w, h - 88],
    ],
    GOLD,
  );
  polygon(
    doc,
    [
      [w, h],
      [w - 91, h],
      [w, h - 80],
    ],
    PRIMARY,
  );
  // Right-edge mid cluster, sitting between the seal and the corner.
  polygon(
    doc,
    [
      [w, 88],
      [w - 24, 104],
      [w, 120],
    ],
    PRIMARY,
  );
  polygon(
    doc,
    [
      [w - 10, 96],
      [w - 20, 104],
      [w - 10, 112],
    ],
    GOLD,
  );
}

/** Gold rosette seal with a scalloped edge and navy ribbon tails. */
function drawSeal(doc: jsPDF, cx: number, cy: number): void {
  // Ribbon tails first so the disc overlaps them.
  polygon(
    doc,
    [
      [cx - 9, cy + 8],
      [cx - 2, cy + 10],
      [cx - 2, cy + 27],
      [cx - 5.5, cy + 22.5],
      [cx - 9, cy + 27],
    ],
    PRIMARY,
  );
  polygon(
    doc,
    [
      [cx + 2, cy + 10],
      [cx + 9, cy + 8],
      [cx + 9, cy + 27],
      [cx + 5.5, cy + 22.5],
      [cx + 2, cy + 27],
    ],
    PRIMARY,
  );

  // Scalloped edge — ring of small discs behind the main circle.
  doc.setFillColor(GOLD);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    doc.circle(cx + Math.cos(a) * 14.2, cy + Math.sin(a) * 14.2, 2, "F");
  }

  doc.setFillColor(GOLD);
  doc.circle(cx, cy, 14.2, "F");
  doc.setDrawColor(GOLD_LIGHT);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, 11.6, "S");
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, 10.6, "S");

  doc.setFont(SERIF_FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(GOLD_DARK);
  doc.text("SKILLUP", cx, cy - 0.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("1.0", cx, cy + 5, { align: "center" });
}

function drawSignatureBlock(
  doc: jsPDF,
  signatory: CertificateSignatory,
  cx: number,
  lineY: number,
): void {
  if (signatory.image) {
    try {
      const props = doc.getImageProperties(signatory.image);
      const maxW = 44;
      const maxH = 18;
      const scale = Math.min(maxW / props.width, maxH / props.height);
      const w = props.width * scale;
      const h = props.height * scale;
      doc.addImage(signatory.image, "PNG", cx - w / 2, lineY - 2 - h, w, h);
    } catch {
      // Bad image data - fall back to the plain line.
    }
  }

  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.4);
  doc.line(cx - 28, lineY, cx + 28, lineY);

  const name = signatory.name.trim();
  if (name) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(NAVY);
    doc.text(name, cx, lineY + 5.5, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.text(signatory.title, cx, lineY + 10.5, { align: "center" });
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(NAVY);
    doc.text(signatory.title, cx, lineY + 5.5, { align: "center" });
  }
}
