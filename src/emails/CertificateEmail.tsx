import { Heading, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface CertificateEmailProps {
  firstName: string;
  trackName: string;
}

export default function CertificateEmail({
  firstName = "friend",
  trackName = "your track",
}: CertificateEmailProps) {
  return (
    <EmailLayout preview="Your SkillUp 1.0 certificate of participation">
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        Your certificate is attached, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        Congratulations on completing <strong>{trackName}</strong> at SkillUp
        1.0. Attached is your Certificate of Participation — keep it, share it,
        and put it to work.
      </Text>
      <Text style={{ marginTop: 16, fontSize: 13, color: palette.muted }}>
        Tag <strong>@foursquarecement</strong> when you share online — we love
        to see what you’re building.
      </Text>
    </EmailLayout>
  );
}
