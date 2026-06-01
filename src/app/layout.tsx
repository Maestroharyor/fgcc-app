import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display, Space_Grotesk } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { HeroUIProvider } from "@/components/providers/HeroUIProvider";
import { TRACKS } from "@/content/tracks";
import { env } from "@/lib/utils/env";
import "./globals.css";

// Google Fonts via next/font - auto subsetting + preload + self-hosting.
// Each font exposes a CSS variable on <html> which globals.css maps to the
// `--font-display`, `--font-sans`, and `--font-serif` Tailwind tokens.
const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Space Grotesk - the closest Cabinet-Grotesk-on-Google-Fonts substitute.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// Playfair Display - high-contrast serif that echoes the publicity flyer's
// "Skillup" wordmark. Only used for the hero headline.
const serif = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
  weight: ["700", "800", "900"],
});

const SITE_NAME = "SkillUp 1.0";
const DEFAULT_TITLE = "SkillUp 1.0 - From Skills to Income";
const DEFAULT_DESCRIPTION = `Three-day youth empowerment programme by Foursquare Gospel Church, Cement Missionary HQ. ${TRACKS.length} hands-on skill tracks across digital, creative, and vocational disciplines. Free to attend · June 12 - 14, 2026.`;

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_TITLE,
    template: "%s · SkillUp 1.0",
  },
  description: DEFAULT_DESCRIPTION,
  keywords: [
    "SkillUp 1.0",
    "Foursquare Gospel Church",
    "Cement Missionary HQ",
    "youth empowerment",
    "skill acquisition",
    "Lagos",
    "Nigeria",
    "free training",
    "UI/UX design",
    "photography",
    "video editing",
    "fashion design",
    "vocational training",
    "June 2026",
  ],
  authors: [
    {
      name: "Foursquare Gospel Church, Cement Missionary HQ",
      url: env.NEXT_PUBLIC_SITE_URL,
    },
  ],
  creator: "Foursquare Gospel Church, Cement Missionary HQ",
  publisher: "Foursquare Gospel Church, Cement Missionary HQ",
  category: "education",
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: env.NEXT_PUBLIC_SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_NG",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // Placeholder — fill in after claiming the site in Search Console.
  verification: { google: "" },
};

export const viewport: Viewport = {
  themeColor: "#003DA5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      // data-scroll-behavior: tells Next.js to suppress the `scroll-behavior:
      // smooth` rule during route transitions so back/forward jumps don't
      // animate weirdly.
      data-scroll-behavior="smooth"
      className={`${sans.variable} ${display.variable} ${serif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Top progress bar on route transitions. Brand primary, no spinner. */}
        <NextTopLoader color="#003DA5" height={3} showSpinner={false} />
        <a
          href="#main"
          className="sr-only focus-visible:not-sr-only focus-visible:fixed focus-visible:top-3 focus-visible:left-3 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-primary focus-visible:px-3 focus-visible:py-2 focus-visible:text-white focus-visible:shadow-lift"
        >
          Skip to content
        </a>
        <HeroUIProvider>{children}</HeroUIProvider>
      </body>
    </html>
  );
}
