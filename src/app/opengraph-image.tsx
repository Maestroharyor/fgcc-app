import { ImageResponse } from "next/og";
import { TRACKS } from "@/content/tracks";

export const alt =
  "SkillUp 1.0 - From Skills to Income · Foursquare Gospel Church, Cement Missionary District Headquarters · June 12 - 14, 2026";

export const size = { width: 1200, height: 630 } as const;

export const contentType = "image/png";

/**
 * Dynamic Open Graph card rendered at build time by `next/og` (Satori).
 *
 * Picked up automatically by Next.js as the site-wide og:image and
 * twitter:image. Individual pages can override by adding their own
 * `opengraph-image.tsx` in their segment.
 */
export default function OpenGraphImage(): ImageResponse {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "72px 80px",
        background:
          "linear-gradient(135deg, #001f5b 0%, #003DA5 55%, #1e5fd6 100%)",
        color: "white",
        fontFamily:
          "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "rgba(255,255,255,0.14)",
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          FGC
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 22, fontWeight: 600 }}>
            Foursquare Gospel Church
          </div>
          <div
            style={{
              fontSize: 14,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              marginTop: 4,
            }}
          >
            Cement Missionary District Headquarters · Lagos
          </div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            fontSize: 18,
            textTransform: "uppercase",
            letterSpacing: "0.28em",
            opacity: 0.78,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 10,
              height: 10,
              borderRadius: 999,
              background: "#F59E0B",
            }}
          />
          <span>Free youth empowerment programme</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 116,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          SkillUp <span style={{ color: "#F59E0B", marginLeft: 18 }}>1.0</span>
          <span style={{ color: "#F59E0B" }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 44,
            fontWeight: 500,
            opacity: 0.92,
            letterSpacing: "-0.02em",
          }}
        >
          From Skills to Income.
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 22,
          letterSpacing: "0.05em",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: "0.22em" }}>
            DATES
          </div>
          <div style={{ fontWeight: 600 }}>June 12 - 14, 2026</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: "0.22em" }}>
            TRACKS
          </div>
          <div
            style={{ fontWeight: 600 }}
          >{`${TRACKS.length} hands-on disciplines`}</div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 14, opacity: 0.7, letterSpacing: "0.22em" }}>
            COST
          </div>
          <div style={{ fontWeight: 600 }}>Free to attend</div>
        </div>
      </div>
    </div>,
    { ...size },
  );
}
