import { Button, Heading, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface WaitlistOfferEmailProps {
  firstName: string;
  trackName: string;
  claimUrl: string;
  expiresAt: string;
}

export default function WaitlistOfferEmail({
  firstName = "friend",
  trackName = "the track",
  claimUrl = "#",
  expiresAt = "in 24 hours",
}: WaitlistOfferEmailProps) {
  return (
    <EmailLayout preview={`A SkillUp spot just opened in ${trackName}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        A spot just opened, {firstName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        Great news — a place has opened up in <strong>{trackName}</strong>. It’s
        yours if you claim it within {expiresAt}.
      </Text>

      <Text style={{ textAlign: "center", marginTop: 22 }}>
        <Button
          href={claimUrl}
          style={{
            background: palette.gold,
            color: "white",
            padding: "14px 26px",
            borderRadius: 999,
            fontWeight: 700,
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          Claim my spot
        </Button>
      </Text>

      <Text style={{ marginTop: 18, fontSize: 12, color: palette.muted }}>
        If you don’t claim it in time, the spot is automatically offered to the
        next person on the waitlist. No hard feelings either way.
      </Text>
    </EmailLayout>
  );
}
