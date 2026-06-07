import { z } from "zod";

const phoneRegex = /^[+0-9()\-\s]{7,20}$/;

/**
 * Inline Nigerian-phone normaliser. Mirrors `normaliseNigerianPhone` in
 * `src/lib/sms/termii.ts` so we can use it inside the shared validation
 * schema without dragging the SMS module (and its fetch surface) into the
 * client RHF bundle.
 */
function normalisePhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("234")) return `+${cleaned}`;
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}

const baseName = z
  .string({ message: "Full name is required" })
  .trim()
  .min(2, "Please enter your full name")
  .max(80, "Name is too long");

const baseEmail = z
  .string({ message: "Email is required" })
  .trim()
  .toLowerCase()
  .min(1, "Email is required")
  .email("Enter a valid email address");

const basePhone = z
  .string({ message: "Phone number is required" })
  .trim()
  .regex(phoneRegex, "Enter a valid phone number")
  .transform(normalisePhone);

/** Phone that may be left blank. Mirrors the optional idiom used by EnquirySchema. */
const basePhoneOptional = basePhone
  .optional()
  .or(z.literal("").transform(() => undefined));

const optionalString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v?.length ? v : undefined));

/**
 * Required church/organisation field. Used by self-registration and per-row
 * Register-for-Others rows. The form's ChurchSelect lets users either pick
 * from the district catalogue (`src/content/churches.ts`) or choose "Other"
 * and type a free-text value. The schema doesn't care which path produced
 * the value — only that some non-trivial string arrived.
 */
const requiredChurch = z
  .string({ message: "Pick or type a church / organisation" })
  .trim()
  .min(2, "Pick or type a church / organisation")
  .max(120, "That church name is too long");

export const GenderEnum = z.enum(["male", "female"], {
  message: "Pick a gender",
});

export const AgeGroupEnum = z.enum(["under_18", "18_25", "26_35", "36_plus"], {
  message: "Pick your age group",
});

export const RelationshipEnum = z.enum(
  ["pastor", "parent", "friend", "church_worker", "other"],
  { message: "Pick your relationship to the registrant" },
);

export const HowHeardEnum = z.enum(
  ["whatsapp", "social_media", "church", "friend", "other"],
  { message: "Pick where you heard about SkillUp" },
);

/**
 * Used by both the public registration form (RHF) and the server action that
 * inserts the row. Re-validation on the server is non-negotiable - never trust
 * the client-side parse alone.
 */
export const RegistrationSchema = z.object({
  full_name: baseName,
  email: baseEmail,
  phone: basePhone,
  gender: GenderEnum,
  age_group: AgeGroupEnum,
  church: requiredChurch,
  track_code: z
    .string({ message: "Pick a track" })
    .trim()
    .min(2, "Pick a track")
    .max(8, "Pick a track")
    .transform((s) => s.toUpperCase()),
  how_heard: HowHeardEnum.optional(),
});

export type RegistrationInput = z.infer<typeof RegistrationSchema>;

export const SubmitterSchema = z.object({
  submitter_name: baseName,
  submitter_email: baseEmail,
  submitter_phone: basePhone,
  relationship: RelationshipEnum,
  church: optionalString,
});

export type SubmitterInput = z.infer<typeof SubmitterSchema>;

/** One registrant inside a Register-for-Others submission. */
export const OthersRegistrantSchema = z.object({
  full_name: baseName,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Enter a valid email address")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: basePhone,
  gender: GenderEnum,
  age_group: AgeGroupEnum,
  church: requiredChurch,
  track_code: z
    .string({ message: "Pick a track for this registrant" })
    .trim()
    .min(2, "Pick a track for this registrant")
    .max(8, "Pick a track for this registrant")
    .transform((s) => s.toUpperCase()),
});

export type OthersRegistrantInput = z.infer<typeof OthersRegistrantSchema>;

export const RegisterOthersSchema = z.object({
  submitter: SubmitterSchema,
  registrants: z
    .array(OthersRegistrantSchema)
    .min(1, "Add at least one person")
    .max(20, "Submit up to 20 people at a time"),
});

/**
 * One admin-entered (offline) row. Same as `OthersRegistrantSchema` but phone is
 * ALSO optional — at the desk an admin may have neither email nor phone. The
 * create route synthesises a placeholder email and stores a null phone.
 */
export const AdminRegistrantSchema = OthersRegistrantSchema.extend({
  phone: basePhoneOptional,
});

export type AdminRegistrantInput = z.infer<typeof AdminRegistrantSchema>;

/**
 * Admin-entered (offline) batch. No submitter block — the logged-in admin is the
 * one entering walk-ins.
 */
export const AdminBatchRegistrationSchema = z.object({
  registrants: z
    .array(AdminRegistrantSchema)
    .min(1, "Add at least one person")
    .max(20, "Add up to 20 people at a time"),
});

export type AdminBatchRegistrationInput = z.infer<
  typeof AdminBatchRegistrationSchema
>;

/**
 * Admin edit of an existing registrant's correctable details. Track is
 * intentionally excluded (it drives capacity/session counts). Email stays
 * required because the column is NOT NULL; phone is optional to match offline
 * rows that were entered without one.
 */
export const UpdateRegistrationSchema = z.object({
  full_name: baseName,
  email: baseEmail,
  phone: basePhoneOptional,
  gender: GenderEnum,
  age_group: AgeGroupEnum,
  church: requiredChurch,
  // UI control only (not a DB column): whether to email the registrant about
  // the change. Defaults on; the admin can uncheck it in the edit modal.
  notify: z.boolean().optional().default(true),
});

export type UpdateRegistrationInput = z.infer<typeof UpdateRegistrationSchema>;

/** Admin track change: which track to move the registrant to. */
export const TrackChangeRequestSchema = z.object({
  track_code: z
    .string({ message: "Pick a track" })
    .trim()
    .min(2, "Pick a track")
    .max(8, "Pick a track")
    .transform((s) => s.toUpperCase()),
});

export type TrackChangeRequestInput = z.infer<typeof TrackChangeRequestSchema>;

export type RegisterOthersInput = z.infer<typeof RegisterOthersSchema>;

export const FeedbackSchema = z.object({
  reference_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^SKU-[A-Z]{2,4}-\d{1,5}$/,
      "Enter a valid reference like SKU-UXD-001",
    ),
  overall_rating: z
    .number({ message: "Give us a rating from 1 to 5" })
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  track_rating: z
    .number({ message: "Rate your track from 1 to 5" })
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  facilitator_rating: z
    .number({ message: "Rate your facilitator from 1 to 5" })
    .int()
    .min(1, "Rating must be between 1 and 5")
    .max(5, "Rating must be between 1 and 5"),
  enjoyed_most: optionalString,
  improvements: optionalString,
  attend_next: z
    .enum(["yes", "no", "maybe"], {
      message: "Pick yes, no, or maybe",
    })
    .optional(),
  testimony: optionalString,
  share_as_testimonial: z.boolean().optional().default(false),
});

export type FeedbackInput = z.infer<typeof FeedbackSchema>;

export const LoginSchema = z.object({
  email: baseEmail,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CheckinSchema = z.object({
  reference_number: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^SKU-[A-Z]{2,4}-\d{1,5}$/,
      "Enter a valid reference like SKU-UXD-001",
    ),
});

export const BroadcastSmsSchema = z.object({
  audience: z.enum(["all", "track", "attended"], {
    message: "Pick an audience",
  }),
  track_code: z
    .string()
    .trim()
    .min(2)
    .max(8)
    .transform((s) => s.toUpperCase())
    .optional(),
  message: z
    .string({ message: "Type a message to send" })
    .min(1, "Type a message to send")
    .max(160, "SMS must be 160 characters or fewer"),
});

export type BroadcastSmsInput = z.infer<typeof BroadcastSmsSchema>;

/**
 * Topics on the `/feedback` general-enquiry form. Mirrors the radio/select
 * options shown to the user; admins use this to triage incoming requests.
 */
export const EnquiryTopicEnum = z.enum(
  ["registration", "track", "church", "partnership", "feedback", "other"],
  { message: "Pick a topic" },
);

export type EnquiryTopic = z.infer<typeof EnquiryTopicEnum>;

/**
 * Validation for the public `/feedback` page (general support / enquiries).
 * Phone is optional so non-Nigerian or anonymous-leaning enquirers aren't
 * blocked; everything else is required because we cannot route or follow up
 * without it.
 */
export const EnquirySchema = z.object({
  full_name: baseName,
  email: baseEmail,
  phone: basePhone.optional().or(z.literal("").transform(() => undefined)),
  topic: EnquiryTopicEnum,
  subject: z
    .string({ message: "Add a short subject" })
    .trim()
    .min(3, "Add a short subject")
    .max(120, "Keep the subject under 120 characters"),
  message: z
    .string({ message: "Tell us a little more" })
    .trim()
    .min(20, "Tell us a little more (at least 20 characters)")
    .max(2000, "Keep the message under 2000 characters"),
  consent: z.literal(true, {
    message: "Tick the consent box so we can reply",
  }),
});

export type EnquiryInput = z.infer<typeof EnquirySchema>;

/**
 * Certificate signatory captions (superadmin certificates page). The name may
 * be empty while the committee is still deciding; the title always prints.
 * The signature PNG itself is validated separately in the server action
 * (magic bytes + size cap) because Zod doesn't see the FormData file.
 */
export const SignatorySchema = z.object({
  slot: z.enum(["chairman", "convener"], { message: "Unknown signatory" }),
  name: z
    .string()
    .trim()
    .max(80, "Keep the name under 80 characters")
    .default(""),
  title: z
    .string({ message: "Add a title" })
    .trim()
    .min(2, "Add a title")
    .max(80, "Keep the title under 80 characters"),
});

export type SignatoryInput = z.infer<typeof SignatorySchema>;
