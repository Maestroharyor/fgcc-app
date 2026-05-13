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

const optionalString = z
  .string()
  .trim()
  .max(120)
  .optional()
  .transform((v) => (v?.length ? v : undefined));

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
  church: optionalString,
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
  church: optionalString,
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
