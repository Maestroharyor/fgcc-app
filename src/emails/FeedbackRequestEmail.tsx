import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface FeedbackRequestEmailProps {
  firstName: string;
  trackName: string;
  feedbackUrl: string;
}

export default function FeedbackRequestEmail({
  firstName = "friend",
  trackName = "your track",
  feedbackUrl = "#",
}: FeedbackRequestEmailProps) {
  return (
    <EmailLayout preview="How was SkillUp 1.0?">
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        How was SkillUp 1.0, {firstName}?
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        Thank you for being part of {trackName}. Your honest feedback is what
        shapes SkillUp 2.0 - it takes under two minutes.
      </Text>
      <Text style={{ textAlign: "center", marginTop: 22 }}>
        <Button
          href={feedbackUrl}
          style={{
            background: palette.blue,
            color: "white",
            padding: "14px 26px",
            borderRadius: 999,
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Share my feedback
        </Button>
      </Text>
    </EmailLayout>
  );
}
