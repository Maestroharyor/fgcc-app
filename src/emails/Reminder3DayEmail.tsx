import { Heading, Img, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface Reminder3DayEmailProps {
  firstName: string;
  trackName: string;
  facilitatorName: string | null;
  qrDataUrl: string;
}

export default function Reminder3DayEmail({
  firstName = "friend",
  trackName = "your track",
  facilitatorName = "your facilitator",
  qrDataUrl = "",
}: Reminder3DayEmailProps) {
  return (
    <EmailLayout preview={`3 days to SkillUp 1.0 - ${trackName}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        3 days, {firstName}. Are you ready?
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        SkillUp 1.0 kicks off in three days at Cement Missionary HQ, Lagos. Here
        is everything to know before Friday.
      </Text>

      <Section
        style={{
          marginTop: 16,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "14px 16px",
        }}
      >
        <Row label="Track" value={trackName} />
        <Row label="Facilitator" value={facilitatorName ?? "TBA"} />
        <Row label="Day 1 start" value="Friday, June 12 · 9:00 AM" />
        <Row label="Venue" value="Cement Missionary HQ, Lagos" />
      </Section>

      <Text style={{ fontSize: 13, color: palette.navy, marginTop: 16 }}>
        <strong>What to bring:</strong> a notebook, a pen, and - if you’re on a
        digital track - your laptop. Your facilitator will share anything
        specific in the WhatsApp group before Friday.
      </Text>

      {qrDataUrl && (
        <Section style={{ marginTop: 18, textAlign: "center" }}>
          <Text style={{ fontSize: 11, color: palette.muted, margin: 0 }}>
            Save this QR - show it at the door on day one.
          </Text>
          <Img
            src={qrDataUrl}
            alt="Check-in QR code"
            width={140}
            height={140}
            style={{ margin: "10px auto 0", borderRadius: 12 }}
          />
        </Section>
      )}
    </EmailLayout>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
