import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface EnquiryNotificationEmailProps {
  fullName: string;
  email: string;
  phone: string | null;
  topicLabel: string;
  subject: string;
  message: string;
  submittedAtIso: string;
}

export default function EnquiryNotificationEmail({
  fullName = "Visitor",
  email = "visitor@example.com",
  phone = null,
  topicLabel = "General enquiry",
  subject = "New enquiry",
  message = "-",
  submittedAtIso = new Date().toISOString(),
}: EnquiryNotificationEmailProps) {
  return (
    <EmailLayout preview={`New enquiry from ${fullName} - ${subject}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        New enquiry · {topicLabel}
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
        {phone ? <RowLabel label="Phone" value={phone} /> : null}
        <RowLabel label="Topic" value={topicLabel} />
        <RowLabel label="Subject" value={subject} />
      </Section>

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
          Message
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
          {message}
        </Text>
      </Section>

      <Text style={{ fontSize: 12, color: palette.muted, marginTop: 20 }}>
        Reply directly to this email to respond - the from-address has been set
        to {email}.
      </Text>
    </EmailLayout>
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
