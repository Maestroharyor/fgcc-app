import { jsPDF } from "jspdf";
import {
  registerCertificateFonts,
  SCRIPT_FONT,
  SERIF_FONT,
} from "@/lib/pdf/fonts";

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
  /** Chairman block, bottom left. */
  signatory?: CertificateSignatory | null;
}

const PRIMARY = "#003DA5";
const NAVY = "#0F172A";
const MUTED = "#64748B";
const GOLD = "#C9A227";
const GOLD_LIGHT = "#E3C766";
const GOLD_DARK = "#8A6D14";
const PAGE_BG = "#F7F8FC";
const PATTERN = "#E7EBF5";
const RIBBON_SHADOW = "#022B72";
const RIBBON_HIGHLIGHT = "#2B62C4";
const RIBBON_DEEP = "#021A4D";
const SEAL_SHADOW = "#D5DAE7";

const EVENT_DATES = "June 12 – 14, 2026";
const VENUE =
  "Foursquare Gospel Church, Cement Missionary District Headquarters";
const COURTESY = "Courtesy: FGCC Youths";

// Capitalise the first letter after a start, space, hyphen, or apostrophe so a
// name typed as "john doe" or "JOHN DOE" renders "John Doe". Surnames with
// intentional internal caps (e.g. "McDonald") become "Mcdonald".
function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase()
    .replace(
      /(^|[\s'-])([a-z])/g,
      (_, sep: string, ch: string) => sep + ch.toUpperCase(),
    );
}

export async function buildCertificate({
  fullName,
  trackName,
  referenceNumber,
  signatory = null,
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
  drawWatermarkSeal(doc, CX, 100, 40);

  // Double frame: thin gold outer rect, navy hairline inside, gold corner
  // ticks for the engraved look.
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.5);
  doc.rect(11, 11, W - 22, H - 22, "S");
  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.2);
  doc.rect(13.5, 13.5, W - 27, H - 27, "S");
  drawCornerTicks(doc, W, H);

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

  // Name — script font, fitted to the column. Title-cased for consistent
  // presentation regardless of how it was typed at registration.
  const displayName = toTitleCase(fullName);
  const nameSize = fitFontSize(
    doc,
    displayName,
    SCRIPT_FONT,
    "normal",
    168,
    40,
    22,
  );
  doc.setFont(SCRIPT_FONT, "normal");
  doc.setFontSize(nameSize);
  doc.setTextColor(GOLD_DARK);
  doc.text(displayName, CX, 93, { align: "center" });

  doc.setDrawColor(PRIMARY);
  doc.setLineWidth(0.4);
  doc.line(CX - 85, 98, CX + 85, 98);

  // Gold diamond ornament on the rule, echoing the background pattern.
  polygon(
    doc,
    [
      [CX, 98 - 2.2],
      [CX + 2.2, 98],
      [CX, 98 + 2.2],
      [CX - 2.2, 98],
    ],
    GOLD,
  );
  doc.setFillColor(GOLD);
  doc.circle(CX - 5.5, 98, 0.55, "F");
  doc.circle(CX + 5.5, 98, 0.55, "F");

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
    "hosted by Foursquare Gospel Church, Cement Missionary District Headquarters.";
  const wrapped = doc.splitTextToSize(body, 170) as string[];
  doc.text(wrapped, CX, 119, { align: "center", lineHeightFactor: 1.5 });

  // ── Bottom row: signature left, dates + venue right ───────────────────────
  if (signatory) drawSignatureBlock(doc, signatory, 80, 166);

  // Date sits above the rule, mirroring the signature image on the left.
  const dateX = W - 84;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text(EVENT_DATES, dateX, 163.5, { align: "center" });
  doc.setDrawColor(NAVY);
  doc.setLineWidth(0.4);
  doc.line(dateX - 28, 166, dateX + 28, 166);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(MUTED);
  // Narrow wrap so the venue clears the bottom-right corner triangles.
  const venueLines = doc.splitTextToSize(VENUE, 38) as string[];
  doc.text(venueLines, dateX, 171.5, {
    align: "center",
    lineHeightFactor: 1.4,
  });

  // ── Reference (bottom left, inside the frame) ─────────────────────────────
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(MUTED);
  // Inside the hairline and clear of the corner tick. The courtesy credit sits
  // one line below the reference.
  doc.text(`Ref: ${referenceNumber}`, 22, H - 22);
  doc.text(COURTESY, 22, H - 17);

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

const WM_FILL = "#EFF2F9";
const WM_LINE = "#E1E6F2";

/** Large, very faint ghost of the rosette behind the body copy. */
function drawWatermarkSeal(
  doc: jsPDF,
  cx: number,
  cy: number,
  r: number,
): void {
  doc.setFillColor(WM_FILL);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    doc.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.14, "F");
  }
  doc.circle(cx, cy, r, "F");
  doc.setDrawColor(WM_LINE);
  doc.setLineWidth(0.5);
  doc.circle(cx, cy, r * 0.82, "S");
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, r * 0.75, "S");
}

/** Small gold L-brackets just inside the navy hairline corners. */
function drawCornerTicks(doc: jsPDF, w: number, h: number): void {
  const inset = 13.5 + 2.2;
  const arm = 5;
  doc.setDrawColor(GOLD);
  doc.setLineWidth(0.4);
  for (const dx of [1, -1] as const) {
    for (const dy of [1, -1] as const) {
      const x = dx === 1 ? inset : w - inset;
      const y = dy === 1 ? inset : h - inset;
      doc.line(x, y, x + dx * arm, y);
      doc.line(x, y, x, y + dy * arm);
    }
  }
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

/** Gold rosette seal with a scalloped edge and splayed swallowtail ribbons. */
function drawSeal(doc: jsPDF, cx: number, cy: number): void {
  // Soft page shadow so the medal lifts off the background. Drawn before the
  // ribbon so it never greys the blue tails.
  doc.setFillColor(SEAL_SHADOW);
  doc.circle(cx + 0.8, cy + 1.3, 16.3, "F");

  // Ribbon tails next so the disc overlaps their tops.
  drawRibbonTail(doc, cx, cy, -1);
  drawRibbonTail(doc, cx, cy, 1);

  // Scalloped edge — ring of small discs behind the main circle.
  doc.setFillColor(GOLD);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    doc.circle(cx + Math.cos(a) * 14.2, cy + Math.sin(a) * 14.2, 2, "F");
  }

  doc.setFillColor(GOLD);
  doc.circle(cx, cy, 14.2, "F");
  doc.setDrawColor(GOLD_DARK);
  doc.setLineWidth(0.45);
  doc.circle(cx, cy, 14.2, "S");
  doc.setDrawColor(GOLD_LIGHT);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, 11.6, "S");
  doc.setLineWidth(0.25);
  doc.circle(cx, cy, 10.6, "S");

  // Navy lettering for contrast against the gold disc.
  doc.setFont(SERIF_FONT, "bold");
  doc.setFontSize(10);
  doc.setTextColor(NAVY);
  doc.text("SKILLUP", cx, cy - 0.5, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("1.0", cx, cy + 5, { align: "center" });
}

type Point = [number, number];

const lerp = (p: Point, q: Point, t: number): Point => [
  p[0] + (q[0] - p[0]) * t,
  p[1] + (q[1] - p[1]) * t,
];

/**
 * One satin ribbon tail, splayed outward with a swallowtail end.
 * `side` is -1 for the left tail, 1 for the right. Depth comes from layered
 * flat tones: a shadowed inner half, a sheen strip on the outer half, and a
 * dark band where the disc casts its shadow as the tail emerges.
 */
function drawRibbonTail(
  doc: jsPDF,
  cx: number,
  cy: number,
  side: 1 | -1,
): void {
  // Edge rails; the tops tuck behind the disc (drawn after).
  const aIn: Point = [cx + side * 1.5, cy + 8];
  const aOut: Point = [cx + side * 11, cy + 4];
  const bIn: Point = [cx + side * 8.5, cy + 31.5];
  const bOut: Point = [cx + side * 17.5, cy + 27.5];

  const top = (t: number) => lerp(aIn, aOut, t);
  const straightBottom = (t: number) => lerp(bIn, bOut, t);

  // Swallowtail apex: bottom midpoint pulled back toward the disc.
  const aMid = top(0.5);
  const bMid = straightBottom(0.5);
  const len = Math.hypot(bMid[0] - aMid[0], bMid[1] - aMid[1]);
  const apex: Point = [
    bMid[0] - ((bMid[0] - aMid[0]) / len) * 5,
    bMid[1] - ((bMid[1] - aMid[1]) / len) * 5,
  ];
  // Bottom edge following the notch.
  const bottom = (t: number) =>
    t < 0.5 ? lerp(bIn, apex, t / 0.5) : lerp(apex, bOut, (t - 0.5) / 0.5);
  // Point at `t` across the width, `s` along the length.
  const at = (t: number, s: number) => lerp(top(t), straightBottom(t), s);

  // Two-tone fold: shadowed inner half, base outer half.
  polygon(doc, [aIn, top(0.5), apex, bIn], RIBBON_SHADOW);
  polygon(doc, [top(0.5), aOut, bOut, apex], PRIMARY);

  // Satin sheen strip running down the outer half.
  polygon(
    doc,
    [top(0.66), top(0.82), bottom(0.82), bottom(0.66)],
    RIBBON_HIGHLIGHT,
  );

  // Shadow the disc casts across the tail just below where it emerges.
  polygon(
    doc,
    [at(0, 0.4), at(0.5, 0.4), at(0.5, 0.49), at(0, 0.49)],
    RIBBON_DEEP,
  );
  polygon(
    doc,
    [at(0.5, 0.4), at(1, 0.4), at(1, 0.49), at(0.5, 0.49)],
    RIBBON_SHADOW,
  );
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
