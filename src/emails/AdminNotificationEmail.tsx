import { Heading, Text } from "@react-email/components";
import { EmailLayout, palette } from "./_Layout";

export interface AdminNotificationEmailProps {
  type: "self" | "others";
  registrants: Array<{
    fullName: string;
    referenceNumber: string;
    trackName: string;
    email: string;
    phone: string;
    church: string | null;
  }>;
  submitter?: {
    name: string;
    email: string;
    phone: string;
    relationship: string;
    church: string | null;
  };
  dashboardUrl: string;
}

export default function AdminNotificationEmail({
  type = "self",
  registrants = [],
  submitter,
  dashboardUrl = "/admin/registrations",
}: AdminNotificationEmailProps) {
  return (
    <EmailLayout
      preview={`New registration: ${registrants[0]?.fullName ?? "-"} (${registrants[0]?.trackName ?? "-"})`}
    >
      <Heading
        as="h1"
        style={{
          fontSize: 20,
          fontWeight: 700,
          margin: 0,
          color: palette.navy,
        }}
      >
        New SkillUp registration
      </Heading>
      <Text style={{ fontSize: 13, color: palette.muted, marginTop: 4 }}>
        Type:{" "}
        {type === "self" ? "Self-registration" : "Registered by someone else"}
      </Text>

      {submitter && (
        <Text
          style={{
            marginTop: 14,
            fontSize: 13,
            color: palette.navy,
            background: palette.creamMid,
            padding: 12,
            borderRadius: 8,
          }}
        >
          <strong>Submitter:</strong> {submitter.name} · {submitter.email} ·{" "}
          {submitter.phone} ({submitter.relationship}){" "}
          {submitter.church && `· ${submitter.church}`}
        </Text>
      )}

      <Text
        style={{
          fontSize: 13,
          fontWeight: 600,
          marginTop: 18,
          marginBottom: 6,
          color: palette.navy,
        }}
      >
        {registrants.length}{" "}
        {registrants.length === 1 ? "registrant" : "registrants"}:
      </Text>
      {registrants.map((r) => (
        <Text
          key={r.referenceNumber}
          style={{ margin: "6px 0", fontSize: 13, color: palette.navy }}
        >
          •{" "}
          <span
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              color: palette.blue,
            }}
          >
            {r.referenceNumber}
          </span>{" "}
          - {r.fullName} · {r.trackName} · {r.email} · {r.phone}
          {r.church ? ` · ${r.church}` : ""}
        </Text>
      ))}

      <Text style={{ marginTop: 20, fontSize: 13 }}>
        <a href={dashboardUrl} style={{ color: palette.blue, fontWeight: 600 }}>
          Open in admin dashboard →
        </a>
      </Text>
    </EmailLayout>
  );
}
