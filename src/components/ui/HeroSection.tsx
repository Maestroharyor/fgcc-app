import { ArrowRight, CalendarDays, GraduationCap, MapPin } from "lucide-react";
import Link from "next/link";
import { TRACKS } from "@/content/tracks";
import { env } from "@/lib/utils/env";
import { CountdownTimer } from "./CountdownTimer";

export function HeroSection() {
  const trackCount = TRACKS.length;

  return (
    <section className="hero-sky relative px-6 sm:px-10 pt-12 sm:pt-16 pb-24 overflow-hidden">
      <div className="relative mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-12 lg:gap-16 items-center">
        <div className="flex flex-col gap-7">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/50 bg-gold/25 px-4 py-1.5 font-sans text-[11px] font-semibold uppercase tracking-[0.2em] text-navy">
            <CalendarDays className="h-3.5 w-3.5 text-gold-600" aria-hidden />
            June 12 – 14, 2026 · Lagos
          </span>

          <div className="relative inline-flex flex-col gap-0">
            <h1 className="relative inline-block w-fit font-serif font-black tracking-tight text-navy leading-[0.92] text-[5rem] sm:text-[7rem] lg:text-[9rem]">
              Skillup
              <span
                aria-hidden
                className="absolute top-[8%] -right-3 sm:-right-4 lg:-right-6 grid place-items-center rounded-md bg-gold px-2 py-0.5 font-display text-xl sm:text-2xl lg:text-3xl font-bold text-white shadow-card rotate-[-4deg] tracking-wide"
              >
                1.0
              </span>
            </h1>
            <div className="mt-3 sm:mt-4 ml-1">
              <span className="inline-flex font-display text-base sm:text-2xl font-bold tracking-tight text-primary -translate-y-1.5">
                From Skill to Income...
              </span>
            </div>
          </div>

          <p className="max-w-xl text-lg sm:text-xl leading-relaxed text-navy/75">
            SkillUp 1.0 is a three-day youth empowerment programme by Foursquare
            Gospel Church, Cement Missionary HQ - {trackCount} hands-on skill
            tracks across digital, creative, and vocational disciplines. Free to
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
              See the {trackCount} tracks
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-sans text-xs uppercase tracking-[0.18em] text-navy/55">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3 w-3" aria-hidden />
              Cement HQ · Dopemu, Lagos
            </span>
            <span className="h-1 w-1 rounded-full bg-current opacity-30" />
            <span>{trackCount} skill tracks</span>
            <span className="h-1 w-1 rounded-full bg-current opacity-30" />
            <span>Free admission</span>
          </div>
        </div>

        <HeroVisual trackCount={trackCount} />

        {/* Free sticker floats over the boundary between text + visual. On
            mobile it tucks into the top-right corner of the section. */}
        <FreeSticker className="absolute z-10 -top-2 right-2 sm:top-1/2 sm:-translate-y-1/2 sm:right-2 sm:left-auto lg:right-[30%] xl:right-[33.5%]" />
      </div>
    </section>
  );
}

function HeroVisual({ trackCount }: { trackCount: number }) {
  return (
    <div className="relative aspect-4/5 w-full max-w-md mx-auto">
      <div className="absolute inset-0 rounded-[2rem] bg-linear-to-br from-primary to-primary-700 shadow-lift" />
      <div className="absolute inset-0 rounded-[2rem] overflow-hidden">
        <Decoration />
      </div>
      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
        <div className="text-white">
          <div className="font-sans text-[10px] uppercase tracking-[0.22em] opacity-70">
            SkillUp 1.0
          </div>
          <div className="font-display text-2xl font-semibold leading-tight">
            From Skills
            <br />
            to Income.
          </div>
        </div>
        <div className="grid place-items-center h-12 w-12 rounded-full bg-white/15 text-white backdrop-blur">
          <GraduationCap className="h-5 w-5" aria-hidden />
        </div>
      </div>
      <div className="absolute -top-4 -right-4 grid h-20 w-20 place-items-center rounded-2xl bg-gold font-display font-bold text-white shadow-lift rotate-3">
        <span className="text-2xl leading-none">{trackCount}</span>
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

/**
 * 12-scallop "FREE" badge — echoes the flyer's red sticker. Path is
 * geometrically symmetric around (50, 50) so the label sits visually centred.
 * Float animation pauses under prefers-reduced-motion (see globals.css).
 */
function FreeSticker({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`sticker-float pointer-events-none grid h-28 w-28 sm:h-32 sm:w-32 place-items-center ${className ?? ""}`}
    >
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <title>Free admission</title>
        <path
          d="M 50 4 L 59.83 13.29 L 73 10.16 L 76.87 23.13 L 89.84 27 L 86.71 40.17 L 96 50 L 86.71 59.83 L 89.84 73 L 76.87 76.87 L 73 89.84 L 59.83 86.71 L 50 96 L 40.17 86.71 L 27 89.84 L 23.13 76.87 L 10.16 73 L 13.29 59.83 L 4 50 L 13.29 40.17 L 10.16 27 L 23.13 23.13 L 27 10.16 L 40.17 13.29 Z"
          fill="#dc2626"
        />
      </svg>
      <div className="relative font-display text-xl sm:text-2xl font-extrabold text-white tracking-wider">
        FREE
      </div>
    </div>
  );
}
