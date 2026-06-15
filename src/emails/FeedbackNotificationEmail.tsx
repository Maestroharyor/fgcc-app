import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface FeedbackNotificationEmailProps {
  fullName: string;
  email: string;
  referenceNumber: string;
  trackName: string;
  overallRating: number;
  trackRating: number;
  facilitatorRating: number;
  enjoyedMost?: string | null;
  improvements?: string | null;
  attendNext?: "yes" | "no" | "maybe" | null;
  testimony?: string | null;
  shareAsTestimonial: boolean;
  submittedAtIso: string;
}

function stars(rating: number): string {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(safe)}${"☆".repeat(5 - safe)} (${safe}/5)`;
}

export default function FeedbackNotificationEmail({
  fullName = "Participant",
  email = "participant@example.com",
  referenceNumber = "SKU-XXX-000",
  trackName = "SkillUp track",
  overallRating = 5,
  trackRating = 5,
  facilitatorRating = 5,
  enjoyedMost = null,
  improvements = null,
  attendNext = null,
  testimony = null,
  shareAsTestimonial = false,
  submittedAtIso = new Date().toISOString(),
}: FeedbackNotificationEmailProps) {
  return (
    <EmailLayout preview={`New feedback from ${fullName} - ${overallRating}/5`}>
      <Heading
        as="h1"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        New feedback · {trackName}
      </Heading>
      <Text
        style={{
          fontSize: 13,
          color: palette.muted,
          marginTop: 4,
        }}
      >
        Submitted{" "}
        {new Date(submittedAtIso).toLocaleString("en-NG", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </Text>

      <Section
        style={{
          marginTop: 18,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <RowLabel label="From" value={fullName} />
        <RowLabel label="Email" value={email} />
        <RowLabel label="Reference" value={referenceNumber} />
        <RowLabel label="Track" value={trackName} />
        <RowLabel label="Overall" value={stars(overallRating)} />
        <RowLabel label="Track" value={stars(trackRating)} />
        <RowLabel label="Facilitator" value={stars(facilitatorRating)} />
        {attendNext ? (
          <RowLabel label="Attend next" value={attendNext} />
        ) : null}
        <RowLabel
          label="Testimonial consent"
          value={shareAsTestimonial ? "Yes - may be shared publicly" : "No"}
        />
      </Section>

      {enjoyedMost ? <Block label="Enjoyed most" body={enjoyedMost} /> : null}
      {improvements ? <Block label="Improvements" body={improvements} /> : null}
      {testimony ? <Block label="Testimony" body={testimony} /> : null}

      <Text style={{ fontSize: 12, color: palette.muted, marginTop: 20 }}>
        Reply directly to this email to reach {fullName} - the from-address has
        been set to {email}.
      </Text>
    </EmailLayout>
  );
}

function Block({ label, body }: { label: string; body: string }) {
  return (
    <Section style={{ marginTop: 16 }}>
      <Text
        style={{
          margin: 0,
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.2em",
          color: palette.muted,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          margin: "6px 0 0",
          fontSize: 14,
          color: palette.navy,
          whiteSpace: "pre-wrap",
          lineHeight: 1.5,
        }}
      >
        {body}
      </Text>
    </Section>
  );
}

function RowLabel({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ margin: "4px 0", fontSize: 13, color: palette.navy }}>
      <span
        style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: palette.muted,
          marginRight: 8,
        }}
      >
        {label}
      </span>
      <strong>{value}</strong>
    </Text>
  );
}
