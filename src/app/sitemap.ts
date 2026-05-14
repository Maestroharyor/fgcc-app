import type { MetadataRoute } from "next";
import { env } from "@/lib/utils/env";

/**
 * XML sitemap for crawlers.
 *
 * We list only the public, indexable routes. Transactional pages
 * (`/skillup/register/success`) and post-event-with-token pages
 * (`/skillup/feedback`) are excluded — they're noindex anyway.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const lastModified = new Date();

  return [
    {
      url: `${base}/`,
      lastModified,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/skillup`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${base}/skillup/register`,
      lastModified,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/feedback`,
      lastModified,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
