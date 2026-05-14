import type { MetadataRoute } from "next";
import { env } from "@/lib/utils/env";

/**
 * Robots policy. Public marketing pages are open to all crawlers; the admin
 * console and API surface are blocked so they don't show up in search.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin/", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
