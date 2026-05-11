import Link from "next/link";
import type { ReactNode } from "react";

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
    <header className="sticky top-0 z-30 border-b border-[var(--color-text-navy)]/8 bg-[var(--color-neutral-cream)]/85 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-neutral-cream)]/70">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-4 flex items-center justify-between gap-4">
        <Link href="/skillup" className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary-blue)] text-white font-display font-bold text-xs tracking-tighter">
            FGC
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold text-[var(--color-text-navy)]">
              SkillUp 1.0
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/55">
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
          <a
            href="/skillup#tracks"
            className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
          >
            Tracks
          </a>
          <a
            href="/skillup#schedule"
            className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
          >
            Schedule
          </a>
          <a
            href="/skillup#facilitators"
            className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
          >
            Facilitators
          </a>
          <a
            href="/skillup#faq"
            className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
          >
            FAQ
          </a>
        </nav>
        <Link
          href="/skillup/register"
          className="inline-flex h-10 items-center justify-center rounded-full bg-[var(--color-primary-blue)] px-5 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--color-primary-blue-700)]"
        >
          Register
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-[var(--color-text-navy)]/8 bg-white">
      <div className="mx-auto max-w-6xl px-6 sm:px-10 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--color-primary-blue)] text-white font-display font-bold text-xs tracking-tighter">
                FGC
              </div>
              <span className="font-display font-semibold text-[var(--color-text-navy)]">
                Foursquare Gospel Church
              </span>
            </div>
            <p className="mt-3 text-sm text-[var(--color-text-navy)]/65">
              Cement Missionary HQ · Lagos, Nigeria
            </p>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-navy)]/55">
              Programme
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="/skillup#tracks"
                  className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
                >
                  The 20 tracks
                </a>
              </li>
              <li>
                <a
                  href="/skillup#schedule"
                  className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
                >
                  Schedule
                </a>
              </li>
              <li>
                <Link
                  href="/skillup/register"
                  className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
                >
                  Register
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--color-text-navy)]/55">
              Support
            </div>
            <ul className="mt-3 space-y-2 text-sm">
              <li>
                <a
                  href="/skillup#faq"
                  className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
                >
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="mailto:skillup@fgccement.org"
                  className="text-[var(--color-text-navy)]/75 hover:text-[var(--color-text-navy)]"
                >
                  skillup@fgccement.org
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[var(--color-text-navy)]/8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-navy)]/45">
          <span>© 2026 Foursquare Gospel Church</span>
          <span>SkillUp 1.0 — From Skills to Income</span>
        </div>
      </div>
    </footer>
  );
}
