import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/ui/BrandMark";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="min-h-dvh hero-mesh flex flex-col">
      <div className="px-6 sm:px-10 pt-8">
        <Link href="/skillup" className="inline-flex items-center gap-3">
          <BrandMark size={40} />
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold text-navy">
              SkillUp 1.0
            </div>
            <div className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              Foursquare · Cement HQ
            </div>
          </div>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg rounded-3xl border border-navy/8 bg-white p-8 sm:p-10 shadow-card text-center">
          <div className="font-display text-7xl sm:text-8xl font-semibold tracking-tight text-primary">
            404
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-navy">
            This page wandered off.
          </h1>
          <p className="mt-2 text-sm text-navy/65 leading-relaxed">
            The link may be broken or the page might have moved. Let's get you
            back on track.
          </p>
          <div className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/skillup"
              className="inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 font-display text-sm font-semibold text-white shadow-card transition hover:bg-primary-700"
            >
              Back to SkillUp
            </Link>
            <Link
              href="/skillup/register"
              className="inline-flex h-11 items-center justify-center rounded-full border border-navy/12 bg-white px-6 font-display text-sm font-semibold text-navy transition hover:border-navy/25 hover:bg-cream-100"
            >
              Register for SkillUp 1.0
            </Link>
          </div>
        </div>
      </div>

      <footer className="px-6 sm:px-10 pb-8 text-center font-sans text-[11px] uppercase tracking-[0.18em] text-navy/45">
        © 2026 Foursquare Gospel Church
      </footer>
    </main>
  );
}
