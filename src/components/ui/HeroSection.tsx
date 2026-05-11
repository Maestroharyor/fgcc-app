import { ArrowRight, MapPin, Sparkles } from "lucide-react";
import Link from "next/link";
import { env } from "@/lib/utils/env";
import { CountdownTimer } from "./CountdownTimer";

export function HeroSection() {
  return (
    <section className="hero-mesh relative px-6 sm:px-10 pt-12 sm:pt-16 pb-20">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-12 lg:gap-16 items-center">
        <div className="flex flex-col gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/30 bg-gold/10 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.2em] text-gold-600">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            June 12 – 14, 2026 · Lagos
          </span>

          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight text-navy leading-[1.02]">
            From skills <span className="text-primary">to income</span>
            <span className="text-gold">.</span>
          </h1>

          <p className="max-w-xl text-lg sm:text-xl leading-relaxed text-navy/75">
            SkillUp 1.0 is a three-day youth empowerment programme by Foursquare
            Gospel Church, Cement Missionary HQ — 20 hands-on skill tracks
            across digital, creative, and vocational disciplines. Free to
            attend.
          </p>

          <CountdownTimer
            target={env.NEXT_PUBLIC_EVENT_START_ISO}
            variant="compact"
          />

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <Link
              href="/skillup/register"
              className="group inline-flex h-14 items-center justify-center gap-2 rounded-full bg-primary px-8 font-display font-semibold text-white shadow-lift transition hover:bg-primary-700"
            >
              Register your spot
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
            {/* Plain <a>: hash-only navigation through next/link double-stacks. */}
            <a
              href="#tracks"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-full border border-navy/15 bg-white/60 px-7 font-display font-medium text-navy backdrop-blur transition hover:bg-white"
            >
              See the 20 tracks
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.18em] text-navy/55">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" aria-hidden />
              Cement Missionary HQ
            </span>
            <span className="h-1 w-1 rounded-full bg-current opacity-30" />
            <span>20 skill tracks</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-30" />
            <span>Free admission</span>
          </div>
        </div>

        <HeroVisual />
      </div>
    </section>
  );
}

function HeroVisual() {
  return (
    <div className="relative aspect-4/5 w-full max-w-md mx-auto">
      <div className="absolute inset-0 rounded-[2rem] bg-linear-to-br from-primary to-primary-700 shadow-lift" />
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
        <Decoration />
      </div>
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
        <div className="text-white">
          <div className="font-mono text-[10px] uppercase tracking-[0.22em] opacity-70">
            SkillUp 1.0
          </div>
          <div className="font-display text-2xl font-semibold leading-tight">
            From Skills
            <br />
            to Income.
          </div>
        </div>
        <div className="grid place-items-center h-12 w-12 rounded-full bg-white/15 text-white backdrop-blur">
          <Sparkles className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div className="absolute -top-4 -right-4 grid h-20 w-20 place-items-center rounded-2xl bg-gold font-display font-bold text-white shadow-lift rotate-3">
        <span className="text-2xl leading-none">20</span>
        <span className="text-[10px] uppercase tracking-widest">tracks</span>
      </div>
    </div>
  );
}

function Decoration() {
  return (
    <svg
      className="absolute inset-0 h-full w-full opacity-30"
      viewBox="0 0 400 500"
      aria-hidden="true"
    >
      <defs>
        <pattern
          id="hero-grid"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
        </pattern>
      </defs>
      <rect width="400" height="500" fill="url(#hero-grid)" />
      <circle
        cx="320"
        cy="120"
        r="80"
        fill="white"
        fillOpacity="0.05"
        stroke="white"
        strokeOpacity="0.3"
      />
      <circle
        cx="80"
        cy="380"
        r="100"
        fill="white"
        fillOpacity="0.04"
        stroke="white"
        strokeOpacity="0.25"
      />
      <path
        d="M 60 250 Q 200 100 340 280"
        stroke="white"
        strokeOpacity="0.35"
        strokeWidth="1.5"
        fill="none"
      />
    </svg>
  );
}
