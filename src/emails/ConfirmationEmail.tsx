import { Button, Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface ConfirmationEmailProps {
  firstName: string;
  referenceNumber: string;
  trackName: string;
  facilitatorName: string | null;
  whatsappUrl: string;
  siteUrl: string;
}

export default function ConfirmationEmail({
  firstName = "friend",
  referenceNumber = "SKU-UXD-001",
  trackName = "UI/UX Design",
  facilitatorName = "Facilitator TBA",
  whatsappUrl = "#",
  siteUrl = "https://fgccement.org.ng/skillup",
}: ConfirmationEmailProps) {
  return (
    <EmailLayout preview={`You're confirmed for SkillUp 1.0 - ${trackName}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        You’re in, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        Your registration for SkillUp 1.0 is confirmed. Here are the details
        you’ll need.
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
        <RowLabel label="Facilitator" value={facilitatorName ?? "TBA"} />
        <RowLabel label="Dates" value="June 12 – 14, 2026" />
        <RowLabel
          label="Venue"
          value="Cement Missionary District Headquarters, Lagos"
        />
      </Section>

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
          The group is where your facilitator will share materials, day-of
          updates, and any pre-work.
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
