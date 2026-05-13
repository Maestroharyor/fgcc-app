import { ArrowRight, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FAQItem } from "@/components/ui/FAQItem";
import { FacilitatorCard } from "@/components/ui/FacilitatorCard";
import { HeroSection } from "@/components/ui/HeroSection";
import { Section } from "@/components/ui/Section";
import { TrackCard } from "@/components/ui/TrackCard";
import { FAQS } from "@/content/faqs";
import { SCHEDULE } from "@/content/schedule";
import { TRACKS, type Track, type TrackCategory } from "@/content/tracks";
import { VENUE } from "@/content/venue";
import { getTrackCounts, withCapacity } from "@/lib/db/tracks";
import type { TrackWithCapacity } from "@/lib/db/types";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "SkillUp 1.0 - From Skills to Income",
  description:
    "Three days of hands-on training across 15 skill tracks. Free youth empowerment programme by Foursquare Gospel Church, Cement Missionary HQ. June 12–14, 2026.",
};

const CATEGORY_LABELS: Record<TrackCategory, string> = {
  digital: "Digital",
  creative: "Creative",
  vocational: "Vocational",
};

const CATEGORY_BLURB: Record<TrackCategory, string> = {
  digital: "Skills that travel anywhere a screen does.",
  creative: "Express, document, brand.",
  vocational: "Make. Sell. Repeat.",
};

const TRACK_GROUPS: Array<{ category: TrackCategory; tracks: Track[] }> = [
  {
    category: "digital",
    tracks: TRACKS.filter((t) => t.category === "digital"),
  },
  {
    category: "creative",
    tracks: TRACKS.filter((t) => t.category === "creative"),
  },
  {
    category: "vocational",
    tracks: TRACKS.filter((t) => t.category === "vocational"),
  },
];

export default function SkillupLandingPage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <Suspense fallback={<TracksSectionSkeleton />}>
        <TracksSectionAsync />
      </Suspense>
      <FacilitatorsSection />
      <ScheduleSection />
      <FAQSection />
      <FinalCTA />
    </>
  );
}

function AboutSection() {
  return (
    <Section
      id="about"
      eyebrow="About the programme"
      title="A three-day boot for the next generation of marketplace leaders."
      description="SkillUp 1.0 brings together facilitators across digital, creative, and vocational disciplines to equip Nigerian youth - church members and the broader public - with practical skill that turns into income."
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <Stat label="Skill tracks" value="15" tone="blue" />
        <Stat label="Days of training" value="3" tone="gold" />
        <Stat label="Cost to attend" value="Free" tone="coral" />
      </div>
    </Section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "blue" | "gold" | "coral";
}) {
  const toneClasses = {
    blue: "from-primary/8 to-primary/0 text-primary",
    gold: "from-gold/12 to-gold/0 text-gold-600",
    coral: "from-coral/8 to-coral/0 text-coral",
  }[tone];
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-navy/8 bg-white p-6 shadow-card bg-linear-to-br ${toneClasses}`}
    >
      <div className="font-sans text-[10px] uppercase tracking-[0.2em] opacity-80">
        {label}
      </div>
      <div className="mt-2 font-display text-5xl font-semibold tracking-tight text-navy">
        {value}
      </div>
    </div>
  );
}

async function TracksSectionAsync() {
  const capacityRows = withCapacity(await getTrackCounts());
  const capacityByCode = new Map(capacityRows.map((r) => [r.code, r]));
  return <TracksSection capacityByCode={capacityByCode} />;
}

function TracksSection({
  capacityByCode,
}: {
  capacityByCode: Map<string, TrackWithCapacity>;
}) {
  return (
    <Section
      id="tracks"
      eyebrow="The 15 tracks"
      title="Pick the skill you want to walk away with."
      description="Each track runs for the full three days, led by a facilitator already practising professionally. Choose one and go deep."
      className="bg-cream-100"
    >
      <div className="flex flex-col gap-12">
        {TRACK_GROUPS.map(({ category, tracks }) => (
          <div key={category}>
            <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-navy">
                  {CATEGORY_LABELS[category]}
                </h3>
                <p className="text-sm text-navy/65">
                  {CATEGORY_BLURB[category]}
                </p>
              </div>
              <span className="font-sans text-xs uppercase tracking-[0.18em] text-navy/45">
                {tracks.length} tracks
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tracks.map((track) => {
                const cap = capacityByCode.get(track.code);
                return (
                  <TrackCard
                    key={track.code}
                    track={track}
                    remaining={cap?.remaining}
                    capacity={cap?.capacity ?? track.capacity}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function TracksSectionSkeleton() {
  // Render the section chrome and the same per-category headers immediately so
  // the layout doesn't jump when live counts arrive - only the per-card
  // capacity badges differ.
  return (
    <Section
      id="tracks"
      eyebrow="The 15 tracks"
      title="Pick the skill you want to walk away with."
      description="Each track runs for the full three days, led by a facilitator already practising professionally. Choose one and go deep."
      className="bg-cream-100"
    >
      <div className="flex flex-col gap-12">
        {TRACK_GROUPS.map(({ category, tracks }) => (
          <div key={category}>
            <div className="mb-6 flex items-baseline justify-between gap-3 flex-wrap">
              <div>
                <h3 className="font-display text-2xl font-semibold tracking-tight text-navy">
                  {CATEGORY_LABELS[category]}
                </h3>
                <p className="text-sm text-navy/65">
                  {CATEGORY_BLURB[category]}
                </p>
              </div>
              <span className="font-sans text-xs uppercase tracking-[0.18em] text-navy/45">
                {tracks.length} tracks
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {tracks.map((track) => (
                <TrackCard
                  key={track.code}
                  track={track}
                  capacity={track.capacity}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

function FacilitatorsSection() {
  return (
    <Section
      id="facilitators"
      eyebrow="Facilitators"
      title="Practitioners who do the work."
      description="Every track is led by a practitioner - many running businesses or shipping work in this exact field today."
      className="bg-cream-100"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TRACKS.map((track) => (
          <FacilitatorCard key={track.code} track={track} />
        ))}
      </div>
    </Section>
  );
}

function ScheduleSection() {
  return (
    <Section
      id="schedule"
      eyebrow="Programme schedule"
      title="Three days, paced for both depth and momentum."
      description="Track time is the heart of the programme - surrounded by short plenaries, a marketplace talk, and a community-wide showcase."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {SCHEDULE.map((day) => (
          <div
            key={day.label}
            className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card"
          >
            <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
              {day.label}
            </div>
            <div className="mt-1 font-display text-lg font-semibold text-navy">
              {day.date}
            </div>
            <div className="mt-1 text-sm text-navy/65">{day.theme}</div>
            <ul className="mt-5 flex flex-col gap-4">
              {day.blocks.map((block) => (
                <li
                  key={`${day.label}-${block.title}`}
                  className="flex flex-col gap-1 border-l-2 border-gold/40 pl-3"
                >
                  <span className="font-display text-sm font-semibold text-navy">
                    {block.title}
                  </span>
                  <span className="text-xs text-navy/65 leading-relaxed">
                    {block.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <VenueCard />
    </Section>
  );
}

function VenueCard() {
  return (
    <div className="mt-8 rounded-2xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        <MapPin className="h-5 w-5" aria-hidden />
      </div>
      <div className="flex-1">
        <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-primary">
          Where to find us
        </div>
        <div className="mt-1 font-display text-lg font-semibold text-navy">
          {VENUE.name}
        </div>
        <p className="mt-1 text-sm text-navy/70 leading-relaxed">
          {VENUE.street}
          <br />
          {VENUE.landmark} · {VENUE.area}
        </p>
      </div>
      <a
        href={VENUE.mapsUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-11 w-full md:w-auto items-center justify-center gap-2 rounded-full bg-navy px-6 font-display text-sm font-semibold text-white shadow-sm transition hover:bg-navy/90"
      >
        Open in Google Maps
        <ArrowRight className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}

function FAQSection() {
  return (
    <Section
      id="faq"
      eyebrow="Questions"
      title="The things people usually ask."
      description="Still curious about something? Reach us at skillup@fgccement.org."
      className="bg-cream-100"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
        {FAQS.map((faq) => (
          <FAQItem key={faq.q} q={faq.q} a={faq.a} />
        ))}
      </div>
    </Section>
  );
}

function FinalCTA() {
  return (
    <section className="px-6 sm:px-10 py-20">
      <div className="mx-auto max-w-6xl rounded-3xl bg-primary p-10 sm:p-16 text-center text-white shadow-lift">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 font-sans text-[10px] uppercase tracking-[0.2em] text-white/80">
          Free admission
        </span>
        <h2 className="mt-4 font-display text-3xl sm:text-5xl font-semibold tracking-tight">
          Your seat at SkillUp 1.0 is waiting.
        </h2>
        <p className="mt-3 max-w-xl mx-auto text-white/80">
          Register in under two minutes. You will receive your reference code,
          QR check-in pass, and track group link by email.
        </p>
        <Link
          href="/skillup/register"
          className="mt-8 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-gold px-8 font-display font-semibold text-white shadow-lift transition hover:bg-gold-600"
        >
          Register your spot
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
