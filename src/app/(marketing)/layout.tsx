import Link from "next/link";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/ui/BrandMark";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-navy/8 bg-cream/85 backdrop-blur supports-[backdrop-filter]:bg-cream/70">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
        <Link href="/skillup" className="flex items-center gap-3">
          <BrandMark size={36} />
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold text-navy">
              SkillUp 1.0
            </span>
            <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              Foursquare · Cement HQ
            </span>
          </div>
        </Link>
        {/*
          Plain <a> on purpose, not next/link. Hash-only navigation through the
          App Router's Link sometimes double-stacks the hash on re-click
          (`/skillup#tracks#tracks`). Native anchor links just update the URL
          fragment and let the browser scroll, which combined with
          `scroll-behavior: smooth` in globals.css gives a clean UX.
        */}
        <nav className="hidden md:flex items-center gap-7 font-display text-sm">
          <a href="/skillup#tracks" className="text-navy/75 hover:text-navy">
            Tracks
          </a>
          <a href="/skillup#schedule" className="text-navy/75 hover:text-navy">
            Schedule
          </a>
          <a
            href="/skillup#facilitators"
            className="text-navy/75 hover:text-navy"
          >
            Facilitators
          </a>
          <a href="/skillup#faq" className="text-navy/75 hover:text-navy">
            FAQ
          </a>
        </nav>
        <Link
          href="/skillup/register"
          className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700"
        >
          Register
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-navy/8 bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <BrandMark size={36} />
              <span className="font-display font-semibold text-navy">
                Foursquare Gospel Church
              </span>
            </div>
            <p className="mt-3 text-sm text-navy/65">
              Cement Missionary HQ · Lagos, Nigeria
            </p>
          </div>
          <div>
            <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-navy/55">
              Programme
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="/skillup#tracks"
                  className="text-navy/75 hover:text-navy"
                >
                  The 20 tracks
                </a>
              </li>
              <li>
                <a
                  href="/skillup#schedule"
                  className="text-navy/75 hover:text-navy"
                >
                  Schedule
                </a>
              </li>
              <li>
                <Link
                  href="/skillup/register"
                  className="text-navy/75 hover:text-navy"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-navy/55">
              Support
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a href="/skillup#faq" className="text-navy/75 hover:text-navy">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="mailto:skillup@fgccement.org"
                  className="text-navy/75 hover:text-navy"
                >
                  skillup@fgccement.org
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-navy/8 flex flex-col sm:flex-row items-center justify-between gap-2 font-sans text-[11px] uppercase tracking-[0.18em] text-navy/45">
          <span>© 2026 Foursquare Gospel Church</span>
          <span>SkillUp 1.0 - From Skills to Income</span>
        </div>
      </div>
    </footer>
  );
}
