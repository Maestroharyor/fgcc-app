import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface WhatsAppReminderEmailProps {
  firstName: string;
  referenceNumber: string;
  trackName: string;
  whatsappUrl: string;
  siteUrl: string;
}

export default function WhatsAppReminderEmail({
  firstName = "friend",
  referenceNumber = "SKU-UXD-001",
  trackName = "UI/UX Design",
  whatsappUrl = "#",
  siteUrl = "https://fgccement.org.ng/skillup",
}: WhatsAppReminderEmailProps) {
  return (
    <EmailLayout
      preview={`Join your ${trackName} WhatsApp group - important updates land there`}
    >
      <Heading
        as="h1"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        {firstName}, have you joined your track group?
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        All important updates for your <strong>{trackName}</strong> track at
        SkillUp 1.0 are shared in the WhatsApp group: materials, day-of
        logistics, and anything your facilitator needs you to prepare. If you
        haven&apos;t joined yet, do it now so you don&apos;t miss anything.
      </Text>

      <Section style={{ marginTop: 24, textAlign: "center" }}>
        <Button
          href={whatsappUrl}
          style={{
            background: palette.blue,
            color: "white",
            padding: "12px 22px",
            borderRadius: 999,
            fontWeight: 600,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Join your track WhatsApp group
        </Button>
        <Text style={{ marginTop: 12, fontSize: 12, color: palette.muted }}>
          Already in the group? You can ignore this email.
        </Text>
      </Section>

      <Section
        style={{
          marginTop: 20,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "12px 18px",
        }}
      >
        <Text style={{ margin: 0, fontSize: 13, color: palette.navy }}>
          Your reference: <strong>{referenceNumber}</strong>
        </Text>
      </Section>

      <Text style={{ fontSize: 13, color: palette.navy, marginTop: 18 }}>
        See you at SkillUp 1.0 -{" "}
        <a href={siteUrl} style={{ color: palette.blue }}>
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
