import { Heading, Section, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface AdminActionCodeEmailProps {
  code: string;
  /** Human label of the gated action, e.g. "Change track" or "Delete registration". */
  actionLabel: string;
  registrantName: string;
  /** One-line summary of what will happen, e.g. "UI/UX Design -> Photography". */
  detail: string;
  expiresMinutes: number;
}

export default function AdminActionCodeEmail({
  code = "AB12CD",
  actionLabel = "Change track",
  registrantName = "Jane Doe",
  detail = "UI/UX Design -> Photography",
  expiresMinutes = 10,
}: AdminActionCodeEmailProps) {
  return (
    <EmailLayout preview={`Your SkillUp admin confirmation code: ${code}`}>
      <Heading
        as="h1"
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: palette.navy,
          margin: 0,
        }}
      >
        Confirm: {actionLabel}
      </Heading>
      <Text
        style={{
          fontSize: 15,
          lineHeight: 1.6,
          color: palette.navy,
          marginTop: 12,
        }}
      >
        You asked to <strong>{actionLabel.toLowerCase()}</strong> for{" "}
        <strong>{registrantName}</strong> ({detail}). Enter this code in the
        admin dashboard to confirm.
      </Text>

      <Section
        style={{
          marginTop: 20,
          background: palette.creamMid,
          borderRadius: 12,
          padding: "18px",
          textAlign: "center",
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
          Confirmation code
        </Text>
        <Text
          style={{
            margin: "8px 0 0",
            fontSize: 32,
            fontFamily: "ui-monospace, SFMono-Regular, monospace",
            fontWeight: 700,
            color: palette.navy,
            letterSpacing: "0.35em",
          }}
        >
          {code}
        </Text>
      </Section>

      <Text style={{ marginTop: 16, fontSize: 13, color: palette.muted }}>
        The code expires in {expiresMinutes} minutes and works once. If you
        didn&apos;t request this, you can ignore this email; nothing changes
        without the code.
      </Text>
    </EmailLayout>
  );
}
