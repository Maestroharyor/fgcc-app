import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface Reminder1DayEmailProps {
  firstName: string;
  trackName: string;
}

export default function Reminder1DayEmail({
  firstName = "friend",
  trackName = "your track",
}: Reminder1DayEmailProps) {
  return (
    <EmailLayout preview="SkillUp 1.0 starts tomorrow at 9:00 AM">
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        See you tomorrow, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        SkillUp 1.0 starts <strong>tomorrow at 9:00 AM</strong> sharp. Aim to be
        at Cement Missionary District Headquarters a few minutes early -
        registration and check-in start at the door.
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
          Your track
        </Text>
        <Text
          style={{
            margin: "4px 0 0",
            fontSize: 16,
            fontWeight: 600,
            color: palette.navy,
          }}
        >
          {trackName}
        </Text>
      </Section>
    </EmailLayout>
  );
}
