import type { SVGProps } from "react";

/**
 * Inline SVG glyphs keyed off `track.glyph` in src/content/tracks.ts. Kept
 * small, monochromatic, and rendered with currentColor so categories can tint
 * them via parent text-color.
 */
type GlyphKey =
  | "design"
  | "camera"
  | "video"
  | "palette"
  | "code"
  | "megaphone"
  | "microphone"
  | "chart"
  | "sparkles"
  | "droplet"
  | "gem"
  | "fork"
  | "footprint"
  | "briefcase"
  | "flame"
  | "scissors"
  | "needle"
  | "leaf"
  | "yarn"
  | "brush";

interface Props extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number;
}

export function GlyphIcon({ name, size = 28, ...rest }: Props) {
  const key = (name as GlyphKey) || "sparkles";
  return (
    <svg
      role="img"
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {paths[key] ?? paths.sparkles}
    </svg>
  );
}

const paths: Record<GlyphKey, React.ReactNode> = {
  design: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 8h8v8H8z" />
      <path d="M3 12h2M19 12h2M12 3v2M12 19v2" />
    </>
  ),
  camera: (
    <>
      <path d="M4 8h3l2-2h6l2 2h3v11H4z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3z" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1.5 0 2.2-1.2 1.7-2.2-.5-1.1 0-2.3 1.2-2.3H17a4 4 0 0 0 4-4 9 9 0 0 0-9-9.5z" />
      <circle cx="8" cy="10" r="1" />
      <circle cx="12" cy="7" r="1" />
      <circle cx="16" cy="10" r="1" />
    </>
  ),
  code: (
    <>
      <path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 11v2a2 2 0 0 0 2 2h2l9 4V5L8 9H6a2 2 0 0 0-2 2z" />
      <path d="M8 15v3a2 2 0 0 0 4 0v-2" />
    </>
  ),
  microphone: (
    <>
      <rect x="9" y="3" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6" />
    </>
  ),
  chart: (
    <>
      <path d="M3 21h18" />
      <rect x="5" y="13" width="3" height="6" />
      <rect x="10.5" y="9" width="3" height="10" />
      <rect x="16" y="5" width="3" height="14" />
    </>
  ),
  sparkles: (
    <>
      <path d="M12 4l1.6 4.4L18 10l-4.4 1.6L12 16l-1.6-4.4L6 10l4.4-1.6z" />
      <path d="M19 16l.6 1.6L21 18l-1.4.4L19 20l-.6-1.6L17 18l1.4-.4z" />
    </>
  ),
  droplet: (
    <>
      <path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" />
    </>
  ),
  gem: (
    <>
      <path d="M6 9l3-5h6l3 5-6 11z" />
      <path d="M6 9h12M9 4l3 5 3-5M9 4l3 16M15 4l-3 16" />
    </>
  ),
  fork: (
    <>
      <path d="M7 3v8a2 2 0 0 0 2 2v8M7 3v8M11 3v8M9 3v6" />
      <path d="M15 3c2 0 3 1.5 3 4v6c0 1-.7 2-2 2v6" />
    </>
  ),
  footprint: (
    <>
      <ellipse cx="9" cy="14" rx="3.5" ry="6" />
      <circle cx="6" cy="6" r="1" />
      <circle cx="9" cy="4" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="15" cy="7" r="1" />
      <circle cx="17" cy="10" r="1" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
    </>
  ),
  flame: (
    <>
      <path d="M12 3c2 4 6 5 6 10a6 6 0 0 1-12 0c0-3 2-4 3-7 1 2 2 2 3 0z" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M20 4L8.6 15.4M20 20L8.6 8.6" />
    </>
  ),
  needle: (
    <>
      <path d="M21 3l-7 7M14 10l-9 9-2 1 1-2 9-9M14 10l1 1" />
    </>
  ),
  leaf: (
    <>
      <path d="M4 20c0-9 7-16 16-16-1 9-7 16-16 16z" />
      <path d="M4 20l9-9" />
    </>
  ),
  yarn: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M5 9c2 1 4 1 6 0s4-1 6 0M5 15c2-1 4-1 6 0s4 1 6 0M9 4c0 4 0 12-2 16M15 4c0 4 0 12 2 16" />
    </>
  ),
  brush: (
    <>
      <path d="M14 3l7 7-7 7-4-4 7-7z" />
      <path d="M10 13l-3 3a3 3 0 0 0 0 4 3 3 0 0 0 4 0l3-3" />
    </>
  ),
};
