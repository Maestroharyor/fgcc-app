import { Mail, MapPin } from "lucide-react";
import type { Metadata } from "next";
import { EnquiryForm } from "@/components/forms/EnquiryForm";
import { VENUE } from "@/content/venue";
import { env } from "@/lib/utils/env";

const PAGE_TITLE = "Support & Enquiries";
const PAGE_DESCRIPTION =
  "Send a general enquiry, partnership message, or support question to the SkillUp 1.0 team. We respond within 24 hours.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/feedback" },
  openGraph: {
    title: `${PAGE_TITLE} · SkillUp 1.0`,
    description: PAGE_DESCRIPTION,
    url: "/feedback",
    type: "website",
  },
};

const contactPageJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: `${PAGE_TITLE} · SkillUp 1.0`,
  description: PAGE_DESCRIPTION,
  url: `${env.NEXT_PUBLIC_SITE_URL}/feedback`,
  about: {
    "@type": "Organization",
    name: "Foursquare Gospel Church, Cement Missionary District Headquarters",
    email: "skillup@fgccement.org",
    address: {
      "@type": "PostalAddress",
      streetAddress: VENUE.street,
      addressLocality: "Dopemu",
      addressRegion: "Lagos",
      addressCountry: "NG",
    },
  },
};

export default function FeedbackEnquiryPage() {
  return (
    <div className="px-6 sm:px-10 py-12 sm:py-16">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: stringified JSON-LD for SEO.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(contactPageJsonLd),
        }}
      />
      <div className="mx-auto max-w-3xl">
        <span className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          Support
        </span>
        <h1 className="mt-2 font-display text-3xl sm:text-5xl font-semibold tracking-tight text-navy leading-tight">
          Get in touch with the SkillUp team.
        </h1>
        <p className="mt-3 text-base sm:text-lg text-navy/70 max-w-2xl">
          Questions about registration, a specific track, partnerships, or
          something else? Send us a note and we'll come back within 24 hours.
        </p>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,260px)] gap-8 items-start">
          <EnquiryForm />

          <aside className="rounded-3xl border border-navy/8 bg-cream p-6">
            <h2 className="font-display text-base font-semibold text-navy">
              Other ways to reach us
            </h2>
            <ul className="mt-4 space-y-4 text-sm text-navy/75">
              <li className="flex items-start gap-3">
                <Mail
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <a
                    href="mailto:skillup@fgccement.org"
                    className="font-medium text-navy hover:text-primary"
                  >
                    skillup@fgccement.org
                  </a>
                  <p className="text-xs text-navy/55 mt-0.5">
                    Email reaches the same inbox.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                  aria-hidden
                />
                <div>
                  <div className="font-medium text-navy">{VENUE.name}</div>
                  <p className="text-xs text-navy/55 mt-0.5 leading-relaxed">
                    {VENUE.street}
                    <br />
                    {VENUE.landmark} · {VENUE.area}
                  </p>
                  <a
                    href={VENUE.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 font-display text-xs font-medium text-primary hover:text-primary-700"
                  >
                    Open in Google Maps →
                  </a>
                </div>
              </li>
            </ul>
            <p className="mt-6 text-[11px] uppercase tracking-[0.18em] text-navy/45">
              Typical reply within 24 hours
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
