import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface EnquiryAckEmailProps {
  firstName: string;
  topicLabel: string;
  subject: string;
  message: string;
  siteUrl: string;
}

export default function EnquiryAckEmail({
  firstName = "friend",
  topicLabel = "General enquiry",
  subject = "Hello",
  message = "I have a question.",
  siteUrl = "https://register.fgccement.org",
}: EnquiryAckEmailProps) {
  return (
    <EmailLayout preview={`Thanks ${firstName} - we received your enquiry`}>
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        Thanks, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 14,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        We received your enquiry and a member of the SkillUp team will get back
        to you within 24 hours. Here is what you sent us.
      </Text>

      <Section
        style={{
          marginTop: 18,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
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
          Your message
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

      <Text style={{ fontSize: 13, color: palette.navy, marginTop: 22 }}>
        Have a quick follow-up? Just reply to this email - it lands in the
        SkillUp inbox.
      </Text>
      <Text style={{ fontSize: 12, color: palette.muted, marginTop: 6 }}>
        Visit{" "}
        <a href={siteUrl} style={{ color: palette.blue }}>
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>{" "}
        for SkillUp 1.0 details.
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
