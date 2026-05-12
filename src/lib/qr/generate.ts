import QRCode from "qrcode";

/**
 * Generate a QR code as a base64 data URL. Server-only - wraps `qrcode`'s
 * `toDataURL` with our brand-friendly defaults.
 */
export async function qrDataUrl(
  payload: string,
  opts: { width?: number; margin?: number } = {},
): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    width: opts.width ?? 320,
    margin: opts.margin ?? 1,
    color: { dark: "#0F172A", light: "#FAFAF8" },
  });
}

/** Raw PNG buffer - used when embedding QR into a PDF or sending as attachment. */
export async function qrPngBuffer(
  payload: string,
  opts: { width?: number } = {},
): Promise<Buffer> {
  return QRCode.toBuffer(payload, {
    errorCorrectionLevel: "M",
    width: opts.width ?? 480,
    margin: 1,
    color: { dark: "#0F172A", light: "#FAFAF8" },
  });
}
