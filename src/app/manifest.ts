import type { MetadataRoute } from "next";
import { TRACKS } from "@/content/tracks";

/**
 * Web App Manifest. Lets Android / Chrome offer "Add to Home Screen" and
 * gives the browser brand colours for the address bar / splash screen.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SkillUp 1.0 - From Skills to Income",
    short_name: "SkillUp 1.0",
    description: `Three-day youth empowerment programme by Foursquare Gospel Church, Cement Missionary District Headquarters. ${TRACKS.length} skill tracks. Free to attend. June 12 - 14, 2026.`,
    start_url: "/skillup",
    scope: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#003DA5",
    orientation: "portrait",
    categories: ["education", "events", "lifestyle"],
    icons: [
      {
        src: "/icon.png",
        sizes: "216x216",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon.png",
        sizes: "216x216",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
