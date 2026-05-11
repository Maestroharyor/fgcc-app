/**
 * Static catalogue of the 20 SkillUp 1.0 tracks.
 *
 * Source of truth for marketing pages, registration dropdowns, and confirmation
 * emails. The Supabase `tracks` table mirrors `code`, `name`, `category`,
 * `facilitator_name`, `glyph_key`, and `capacity` from this file (seed migration
 * derives from here). WhatsApp/Telegram group links live ONLY here — never the DB.
 */

export type TrackCategory = "digital" | "creative" | "vocational";

export interface Track {
  code: string; // 3-letter, unique. Used in reference numbers (SKU-UXD-001).
  name: string;
  category: TrackCategory;
  facilitator: string | null; // null = "Facilitator: TBA"
  glyph: string; // GlyphIcon key
  description: string;
  capacity: number;
  whatsappUrl: string;
  telegramUrl: string | null;
}

/**
 * Placeholder shared across all 20 tracks until per-track groups are confirmed.
 * Swap each track's `whatsappUrl` to its real invite link as they're created.
 */
const PLACEHOLDER_WHATSAPP_URL =
  "https://chat.whatsapp.com/PLACEHOLDER_SKILLUP_GROUP";
const PLACEHOLDER_TELEGRAM_URL: string | null = null;

const wa = PLACEHOLDER_WHATSAPP_URL;
const tg = PLACEHOLDER_TELEGRAM_URL;

export const TRACKS: Track[] = [
  {
    code: "UXD",
    name: "UI/UX Design",
    category: "digital",
    facilitator: "Ayomide Odewale",
    glyph: "design",
    description:
      "Design intuitive digital products. Learn user research, wireframing, and Figma fluency.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "PHO",
    name: "Photography & Photo Editing",
    category: "creative",
    facilitator: "Bro Ola",
    glyph: "camera",
    description:
      "Composition, lighting, and editing in Lightroom — from phone shots to portfolio pieces.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "VID",
    name: "Videography & Video Editing",
    category: "creative",
    facilitator: "Bro Matthew",
    glyph: "video",
    description:
      "Tell stories that move. Shooting fundamentals, editing in CapCut/Premiere, and reels that convert.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "GFX",
    name: "Graphic Design",
    category: "creative",
    facilitator: "Joshomowole",
    glyph: "palette",
    description:
      "Posters, flyers, social media kits — design that earns clients in Lagos and beyond.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "CWD",
    name: "Coding & Web Development",
    category: "digital",
    facilitator: "Dozie",
    glyph: "code",
    description:
      "Build your first real website. HTML, CSS, and the JavaScript that powers modern apps.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "DMK",
    name: "Digital Marketing & Social Media",
    category: "digital",
    facilitator: "Mide / Emma",
    glyph: "megaphone",
    description:
      "Turn attention into income — content strategy, paid ads, analytics, and brand growth.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "CCB",
    name: "Content Creation & Personal Branding",
    category: "digital",
    facilitator: "Bro Idera Solomon",
    glyph: "microphone",
    description:
      "Show up consistently. Build the on-camera and writing skills that compound into a personal brand.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "DAT",
    name: "Data Analysis",
    category: "digital",
    facilitator: "Bro Akintayo Akinyemi",
    glyph: "chart",
    description:
      "Read data, shape insights. Excel, SQL basics, and dashboards that drive decisions.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "GYP",
    name: "Gypsum & Resin Arts",
    category: "vocational",
    facilitator: "Sis Victoria Odewale",
    glyph: "sparkles",
    description:
      "Cast, mould, and finish gypsum and resin pieces — décor and giftware that sells.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "SPM",
    name: "Soap Making & Household Products",
    category: "vocational",
    facilitator: "Mrs Balogun",
    glyph: "droplet",
    description:
      "Liquid soap, bar soap, detergents — formulate, brand, and price for a real market.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "BMK",
    name: "Bead Making & Accessories",
    category: "vocational",
    facilitator: "Aramide",
    glyph: "gem",
    description:
      "Bridal beads, everyday accessories — patterns, finishing, and pricing for profit.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "CTR",
    name: "Small Chops & Catering Basics",
    category: "vocational",
    facilitator: "Mrs Godslove",
    glyph: "fork",
    description:
      "Run a small chops side hustle — recipes, packaging, costing, and customer flow.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "SHO",
    name: "Shoe & Footwear Making",
    category: "vocational",
    facilitator: "Pelumee",
    glyph: "footprint",
    description:
      "Handcraft sandals, slides, and palm slippers. Tools, leatherwork, and finishing.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "VAS",
    name: "Virtual Assistance",
    category: "digital",
    facilitator: null,
    glyph: "briefcase",
    description:
      "Work remotely for global clients — calendar, inbox, CRM, and the soft skills that retain them.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "PCM",
    name: "Perfume, Diffusers & Candle Making",
    category: "vocational",
    facilitator: null,
    glyph: "flame",
    description:
      "Blend fragrances, pour candles, and craft reed diffusers — beautifully packaged.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "WIG",
    name: "Wig Making & Hair Revamping",
    category: "vocational",
    facilitator: null,
    glyph: "scissors",
    description:
      "Build wigs, revamp old hair, style for clients. A skill the Lagos market hires every weekend.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "FSH",
    name: "Fashion Design & Tailoring",
    category: "vocational",
    facilitator: null,
    glyph: "needle",
    description:
      "Sketch, cut, sew. Foundational tailoring skills that grow into a full atelier.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "SKN",
    name: "Skincare & Cosmetics Formulation",
    category: "vocational",
    facilitator: null,
    glyph: "leaf",
    description:
      "Formulate clean skincare and cosmetics — safe ingredients, batch testing, and brand basics.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "KNT",
    name: "Knitting / Crocheting & Textile Crafts",
    category: "vocational",
    facilitator: null,
    glyph: "yarn",
    description:
      "Crochet bags, knit tops, woven crafts — modern, sellable pieces from classic techniques.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
  {
    code: "ADR",
    name: "Kampala / Adire Fabric Dyeing",
    category: "vocational",
    facilitator: null,
    glyph: "brush",
    description:
      "Tie-dye, stencil, and indigo techniques to produce Adire and Kampala fabrics for the runway.",
    capacity: 20,
    whatsappUrl: wa,
    telegramUrl: tg,
  },
];

export const TRACKS_BY_CODE: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.code, t]),
);

export function trackByCode(code: string): Track | undefined {
  return TRACKS_BY_CODE[code.toUpperCase()];
}
