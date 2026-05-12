import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface WaitlistConfirmEmailProps {
  firstName: string;
  trackName: string;
  position: number;
  siteUrl: string;
}

export default function WaitlistConfirmEmail({
  firstName = "friend",
  trackName = "the track",
  position = 1,
  siteUrl = "https://register.fgccement.org",
}: WaitlistConfirmEmailProps) {
  return (
    <EmailLayout preview={`You're on the SkillUp waitlist for ${trackName}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        You’re on the waitlist, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        <strong>{trackName}</strong> is at capacity for now. You’ve been added
        to the waitlist - if a spot opens, we’ll email you with a 24-hour window
        to claim it.
      </Text>

      <Section
        style={{
          marginTop: 16,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "14px 16px",
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
          Your position
        </Text>
        <Text
          style={{
            margin: "4px 0 0",
            fontSize: 28,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontWeight: 700,
            color: palette.navy,
          }}
        >
          #{position}
        </Text>
      </Section>

      <Text style={{ marginTop: 16, fontSize: 13, color: palette.muted }}>
        Want a different track? You can also register for an open one at{" "}
        <a href={`${siteUrl}/skillup/register`} style={{ color: palette.blue }}>
          {siteUrl.replace(/^https?:\/\//, "")}/skillup/register
        </a>
        .
      </Text>
    </EmailLayout>
  );
}
