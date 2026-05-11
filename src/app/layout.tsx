import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Geist_Mono, Inter } from "next/font/google";
import { HeroUIProvider } from "@/components/providers/HeroUIProvider";
import "./globals.css";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://register.fgccement.org",
  ),
  title: {
    default: "SkillUp 1.0 — From Skills to Income",
    template: "%s · SkillUp 1.0",
  },
  description:
    "20 skill tracks. 3 days. Free to attend. Foursquare Gospel Church Cement Missionary HQ · June 12–14, 2026.",
  openGraph: {
    title: "SkillUp 1.0 — From Skills to Income",
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
      className={`${sans.variable} ${display.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <HeroUIProvider>{children}</HeroUIProvider>
      </body>
    </html>
  );
}
