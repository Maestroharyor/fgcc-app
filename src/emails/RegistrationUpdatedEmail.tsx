import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface RegistrationUpdatedEmailProps {
  firstName: string;
  referenceNumber: string;
  trackName: string;
  email: string;
  phone: string | null;
  siteUrl: string;
}

export default function RegistrationUpdatedEmail({
  firstName = "friend",
  referenceNumber = "SKU-UXD-001",
  trackName = "UI/UX Design",
  email = "you@example.com",
  phone = null,
  siteUrl = "https://fgccement.org.ng/skillup",
}: RegistrationUpdatedEmailProps) {
  return (
    <EmailLayout
      preview={`Your SkillUp 1.0 details were updated - ${trackName}`}
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
        Your details were updated, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        A SkillUp 1.0 organiser updated your registration details. Here's what
        we have on file now - please check it over.
      </Text>

      <Section
        style={{
          marginTop: 20,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "16px 18px",
        }}
      >
        <Text
          style={{
            margin: 0,
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            color: palette.muted,
          }}
        >
          Reference number
        </Text>
        <Text
          style={{
            margin: "6px 0 0",
            fontSize: 22,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontWeight: 700,
            color: palette.navy,
            letterSpacing: "0.04em",
          }}
        >
          {referenceNumber}
        </Text>
      </Section>

      <Section style={{ marginTop: 20 }}>
        <RowLabel label="Track" value={trackName} />
        <RowLabel label="Email" value={email} />
        {phone && <RowLabel label="Phone" value={phone} />}
      </Section>

      <Text style={{ fontSize: 13, color: palette.navy, marginTop: 18 }}>
        If anything looks wrong, reply to this email or visit{" "}
        <a href={siteUrl} style={{ color: palette.blue }}>
          {siteUrl.replace(/^https?:\/\//, "")}
        </a>
        .
      </Text>
    </EmailLayout>
  );
}

function RowLabel({ label, value }: { label: string; value: string }) {
  return (
    <Text style={{ margin: "6px 0", fontSize: 14, color: palette.navy }}>
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
