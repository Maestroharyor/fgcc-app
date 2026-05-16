/**
 * Static catalogue of the SkillUp 1.0 tracks.
 *
 * Source of truth for marketing pages, registration dropdowns, and confirmation
 * emails. The Supabase `tracks` table mirrors `code`, `name`, `category`,
 * `facilitator_name`, `glyph_key`, and `capacity` from this file (seed migration
 * derives from here). WhatsApp/Telegram group links live ONLY here - never the DB.
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

const wa = (suffix: string) => `https://chat.whatsapp.com/${suffix}?mode=gi_t`;

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
    whatsappUrl: wa("HnMYu2KvHBAL2vJB59YVwJ"),
    telegramUrl: null,
  },
  {
    code: "PHO",
    name: "Photography & Photo Editing",
    category: "creative",
    facilitator: "Ola",
    glyph: "camera",
    description:
      "Composition, lighting, and editing in Lightroom - from phone shots to portfolio pieces.",
    capacity: 20,
    whatsappUrl: wa("CLgAP6OVMEp1NRGjUZpWrI"),
    telegramUrl: null,
  },
  {
    code: "VID",
    name: "Videography & Video Editing",
    category: "creative",
    facilitator: "Matthew",
    glyph: "video",
    description:
      "Tell stories that move. Shooting fundamentals, editing in CapCut/Premiere, and reels that convert.",
    capacity: 20,
    whatsappUrl: wa("Gz49acdlAFA5CvFXz1qfvP"),
    telegramUrl: null,
  },
  {
    code: "GFX",
    name: "Graphic Design",
    category: "creative",
    facilitator: "Josh Omowole",
    glyph: "palette",
    description:
      "Posters, flyers, social media kits - design that earns clients in Lagos and beyond.",
    capacity: 20,
    whatsappUrl: wa("JB3fGJ2btclITjTbpSpA6I"),
    telegramUrl: null,
  },
  {
    code: "CWD",
    name: "Coding & Web Development",
    category: "digital",
    facilitator: "Chidozie Moses",
    glyph: "code",
    description:
      "Build your first real website. HTML, CSS, and the JavaScript that powers modern apps.",
    capacity: 20,
    whatsappUrl: wa("GEInR19JTnh8spK5SUSXul"),
    telegramUrl: null,
  },
  {
    code: "DMK",
    name: "Digital Marketing & Social Media",
    category: "digital",
    facilitator: "Olamuyiwa Olamide",
    glyph: "megaphone",
    description:
      "Turn attention into income - content strategy, paid ads, analytics, and brand growth.",
    capacity: 20,
    whatsappUrl: wa("KhkrGWjfMBJ8hKeeO0P2gt"),
    telegramUrl: null,
  },
  {
    code: "CCB",
    name: "Content Creation & Personal Branding",
    category: "digital",
    facilitator: "Idara Solomon",
    glyph: "microphone",
    description:
      "Show up consistently. Build the on-camera and writing skills that compound into a personal brand.",
    capacity: 20,
    whatsappUrl: wa("ENArMTPDPrlBzCJtOJyy5W"),
    telegramUrl: null,
  },
  {
    code: "DAT",
    name: "Data Analysis",
    category: "digital",
    facilitator: "Akintayo Akinyemi",
    glyph: "chart",
    description:
      "Read data, shape insights. Excel, SQL basics, and dashboards that drive decisions.",
    capacity: 20,
    whatsappUrl: wa("BSphUAEPbYY03eC2wFgc0p"),
    telegramUrl: null,
  },
  {
    code: "GYP",
    name: "Gypsum & Resin Arts",
    category: "vocational",
    facilitator: "Victoria Odewale",
    glyph: "sparkles",
    description:
      "Cast, mould, and finish gypsum and resin pieces - décor and giftware that sells.",
    capacity: 20,
    whatsappUrl: wa("DuQtcrTzKeXAL1GbXgIG3D"),
    telegramUrl: null,
  },
  {
    code: "SPM",
    name: "Soap Making & Household Products",
    category: "vocational",
    facilitator: "Mrs Balogun",
    glyph: "droplet",
    description:
      "Liquid soap, bar soap, detergents - formulate, brand, and price for a real market.",
    capacity: 20,
    whatsappUrl: wa("HEfINxQl1bdCAG3VBGPrQC"),
    telegramUrl: null,
  },
  {
    code: "BMK",
    name: "Bead Making & Accessories",
    category: "vocational",
    facilitator: "Aramide",
    glyph: "gem",
    description:
      "Bridal beads, everyday accessories - patterns, finishing, and pricing for profit.",
    capacity: 20,
    whatsappUrl: wa("Jrd5aFfEGuu5vEa8YDdYMl"),
    telegramUrl: null,
  },
  {
    code: "CTR",
    name: "Small Chops & Catering Basics",
    category: "vocational",
    facilitator: "Mrs Godslove",
    glyph: "fork",
    description:
      "Run a small chops side hustle - recipes, packaging, costing, and customer flow.",
    capacity: 20,
    whatsappUrl: wa("JH4S9jl1578HBFPNmJoN4w"),
    telegramUrl: null,
  },
  {
    code: "SHO",
    name: "Shoe & Footwear Making",
    category: "vocational",
    facilitator: "Ade Footcraft",
    glyph: "footprint",
    description:
      "Handcraft sandals, slides, and palm slippers. Tools, leatherwork, and finishing.",
    capacity: 20,
    whatsappUrl: wa("HQTiDB2HjSdIu6ZEkM2Rn5"),
    telegramUrl: null,
  },
  /*
   * Paused for SkillUp 1.0 — facilitators not yet confirmed.
   * WhatsApp groups already exist; restore by uncommenting this block.
   *
  {
    code: "PCM",
    name: "Perfume, Diffusers & Candle Making",
    category: "vocational",
    facilitator: null,
    glyph: "flame",
    description:
      "Blend fragrances, pour candles, and craft reed diffusers - beautifully packaged.",
    capacity: 20,
    whatsappUrl: wa("HkqBv9QabiE991duMJXvVt"),
    telegramUrl: null,
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
    whatsappUrl: wa("J3kUWYynCqVAXA0YzNq8nz"),
    telegramUrl: null,
  },
  */
];

export const TRACKS_BY_CODE: Record<string, Track> = Object.fromEntries(
  TRACKS.map((t) => [t.code, t]),
);

export function trackByCode(code: string): Track | undefined {
  return TRACKS_BY_CODE[code.toUpperCase()];
}
