import type { Metadata, Viewport } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { HeroUIProvider } from "@/components/providers/HeroUIProvider";
import "./globals.css";

// Google Fonts via next/font - auto subsetting + preload + self-hosting.
// Each font exposes a CSS variable on <html> which globals.css maps to the
// `--font-display` and `--font-sans` Tailwind tokens.
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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://register.fgccement.org",
  ),
  title: {
    default: "SkillUp 1.0 - From Skills to Income",
    template: "%s · SkillUp 1.0",
  },
  description:
    "20 skill tracks. 3 days. Free to attend. Foursquare Gospel Church Cement Missionary HQ · June 12–14, 2026.",
  openGraph: {
    title: "SkillUp 1.0 - From Skills to Income",
    description:
      "Register for the SkillUp 1.0 Youth Empowerment Program. June 12–14, 2026.",
    type: "website",
    locale: "en_NG",
  },
  robots: { index: true, follow: true },
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
      className={`${sans.variable} ${display.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HeroUIProvider>{children}</HeroUIProvider>
      </body>
    </html>
  );
}
