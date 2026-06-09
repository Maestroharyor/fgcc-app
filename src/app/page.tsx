import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { TRACKS } from "@/content/tracks";
import { env } from "@/lib/utils/env";

export const metadata: Metadata = {
  title: "Foursquare Gospel Church · Cement Missionary District Headquarters",
  description:
    "Our website is on the way. In the meantime - SkillUp 1.0 is our first big public programme. June 12–14, 2026. Free to attend.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Foursquare Gospel Church · Cement Missionary District Headquarters",
    description:
      "Our church website is on the way. SkillUp 1.0 - our first public programme - is open for registration.",
    url: "/",
    type: "website",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Foursquare Gospel Church, Cement Missionary District Headquarters",
  alternateName: "FGC Cement HQ",
  url: env.NEXT_PUBLIC_SITE_URL,
  logo: `${env.NEXT_PUBLIC_SITE_URL}/icon.png`,
  description:
    "Foursquare Gospel Church, Cement Missionary District Headquarters - the headquarters of the Cement District, Lagos.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "38, Lagos-Abeokuta Expressway",
    addressLocality: "Dopemu",
    addressRegion: "Lagos",
    addressCountry: "NG",
  },
  email: "skillup@fgccement.org",
  sameAs: [] as string[],
};

export default function ComingSoonPage() {
  return (
    <main id="main" className="hero-mesh relative min-h-dvh flex flex-col">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: stringified JSON-LD for SEO.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <header className="px-6 sm:px-10 pt-8">
        <div className="flex items-center gap-3">
          <BrandMark size={40} />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold text-navy">
              Foursquare Gospel Church
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              Cement Missionary District Headquarters · Lagos
            </span>
          </div>
        </div>
      </header>

      <section className="flex-1 flex items-center px-6 sm:px-10 py-12">
        <div className="mx-auto max-w-5xl w-full flex flex-col items-center text-center gap-10">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 font-sans text-[11px] uppercase tracking-[0.2em] text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Coming soon
          </span>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-navy leading-[1.05]">
            Foursquare Gospel Church
            <br />
            <span className="text-primary">
              Cement Missionary District Headquarters
            </span>
          </h1>

          <p className="max-w-2xl text-lg sm:text-xl leading-relaxed text-navy/75">
            We’re building a fresh online home for our church community. While
            that comes together, our first big public programme is open for
            registration.
          </p>

          {/* SkillUp 1.0 teaser card */}
          <div className="w-full max-w-3xl rounded-3xl bg-white border border-navy/8 shadow-lift p-8 sm:p-10 text-left">
            <div className="flex items-center gap-2 font-sans text-[10px] uppercase tracking-[0.2em] text-gold-600">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-gold" />
              First public programme
            </div>
            <h2 className="mt-2 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-navy">
              SkillUp <span className="text-primary">1.0</span>
              <span className="text-gold">.</span>{" "}
              <span className="text-navy/55 font-normal text-2xl sm:text-3xl">
                From Skills to Income
              </span>
            </h2>
            <p className="mt-3 text-navy/70 leading-relaxed">
              A three-day youth empowerment programme - {TRACKS.length} hands-on
              skill tracks across digital, creative, and vocational disciplines.
              Free to attend. Open to church members and the wider public.
            </p>

            <div className="mt-6">
              <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55 mb-2">
                Time to event
              </div>
              <CountdownTimer
                target={env.NEXT_PUBLIC_EVENT_START_ISO}
                variant="compact"
              />
            </div>

            <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/skillup/register"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 font-display font-semibold text-white shadow-card transition hover:bg-primary-700"
              >
                Register for SkillUp 1.0
                <ArrowRight
                  className="h-4 w-4 transition group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href="/skillup"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-navy/15 bg-white px-6 font-display font-medium text-navy hover:bg-cream-100"
              >
                Learn more
              </Link>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-xs uppercase tracking-[0.18em] text-navy/55">
              <span>June 12 – 14, 2026</span>
              <span className="hidden sm:block h-1 w-1 rounded-full bg-current opacity-30" />
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3 w-3" aria-hidden />
                Cement Missionary District Headquarters
              </span>
            </div>
          </div>
        </div>
      </section>

      <footer className="px-6 sm:px-10 pb-8 pt-4">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-[11px] uppercase tracking-[0.18em] text-navy/40">
          <span>
            © 2026 Foursquare Gospel Church · Cement Missionary District
            Headquarters
          </span>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
              href="/feedback"
              className="text-primary hover:text-primary-700"
            >
              Support & enquiries
            </Link>
            <a
              href="mailto:skillup@fgccement.org"
              className="hover:text-navy/70"
            >
              skillup@fgccement.org
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
