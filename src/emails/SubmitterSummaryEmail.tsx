import { Heading, Hr, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface SubmitterSummaryEmailProps {
  submitterName: string;
  registrants: Array<{
    fullName: string;
    referenceNumber: string;
    trackName: string;
    whatsappUrl: string;
  }>;
}

export default function SubmitterSummaryEmail({
  submitterName = "friend",
  registrants = [],
}: SubmitterSummaryEmailProps) {
  return (
    <EmailLayout
      preview={`You registered ${registrants.length} people for SkillUp 1.0`}
    >
      <Heading
        as="h1"
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        Thank you, {submitterName}.
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        You successfully registered {registrants.length}{" "}
        {registrants.length === 1 ? "person" : "people"} for SkillUp 1.0. Here
        are the reference codes and group links - please share them with each
        person you registered.
      </Text>

      {registrants.map((r) => (
        <Section
          key={r.referenceNumber}
          style={{
            marginTop: 14,
            background: palette.creamMid,
            borderRadius: 12,
            padding: "14px 16px",
          }}
        >
          <Text
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              color: palette.navy,
            }}
          >
            {r.fullName}
          </Text>
          <Text
            style={{ margin: "4px 0 0", fontSize: 13, color: palette.muted }}
          >
            {r.trackName}
          </Text>
          <Hr style={{ borderColor: "rgba(15,23,42,0.08)", margin: "8px 0" }} />
          <Text style={{ margin: 0, fontSize: 12 }}>
            <span
              style={{
                fontFamily: "ui-monospace, SFMono-Regular, monospace",
                background: "white",
                padding: "2px 6px",
                borderRadius: 6,
                color: palette.blue,
              }}
            >
              {r.referenceNumber}
            </span>{" "}
            ·{" "}
            <a href={r.whatsappUrl} style={{ color: palette.blue }}>
              WhatsApp group
            </a>
          </Text>
        </Section>
      ))}

      <Text style={{ marginTop: 18, fontSize: 13, color: palette.muted }}>
        Anyone whose email you provided also received their own confirmation
        directly.
      </Text>
    </EmailLayout>
  );
}
