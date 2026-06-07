import type { jsPDF } from "jspdf";
import { GREAT_VIBES_REGULAR } from "./great-vibes";
import { PLAYFAIR_DISPLAY_BOLD } from "./playfair-display";

export const SCRIPT_FONT = "GreatVibes";
export const SERIF_FONT = "PlayfairDisplay";

/**
 * Registers the embedded certificate fonts on a jsPDF document. Call once per
 * document before any `setFont(SCRIPT_FONT | SERIF_FONT)`.
 */
export function registerCertificateFonts(doc: jsPDF): void {
  doc.addFileToVFS("GreatVibes-Regular.ttf", GREAT_VIBES_REGULAR);
  doc.addFont("GreatVibes-Regular.ttf", SCRIPT_FONT, "normal");
  doc.addFileToVFS("PlayfairDisplay-Bold.ttf", PLAYFAIR_DISPLAY_BOLD);
  doc.addFont("PlayfairDisplay-Bold.ttf", SERIF_FONT, "bold");
}
