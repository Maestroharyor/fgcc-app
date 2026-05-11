import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Preview,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import type { ReactNode } from "react";

interface Props {
  preview: string;
  children: ReactNode;
}

export function EmailLayout({ preview, children }: Props) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Tailwind>
        <Body
          style={{
            backgroundColor: "#FAFAF8",
            fontFamily:
              "Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial",
            color: "#0F172A",
            margin: 0,
            padding: 0,
          }}
        >
          <Container
            style={{
              maxWidth: "560px",
              margin: "0 auto",
              padding: "32px 24px 16px",
            }}
          >
            <Section style={{ marginBottom: 24 }}>
              <table cellPadding={0} cellSpacing={0} border={0}>
                <tr>
                  <td>
                    <div
                      style={{
                        background: "#003DA5",
                        color: "white",
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 12,
                        letterSpacing: "-0.02em",
                        textAlign: "center",
                        lineHeight: "36px",
                      }}
                    >
                      FGC
                    </div>
                  </td>
                  <td style={{ paddingLeft: 12 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 14,
                        color: "#0F172A",
                      }}
                    >
                      SkillUp 1.0
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        textTransform: "uppercase",
                        letterSpacing: "0.18em",
                        color: "#475569",
                      }}
                    >
                      Foursquare · Cement HQ
                    </div>
                  </td>
                </tr>
              </table>
            </Section>

            <Section
              style={{
                background: "white",
                borderRadius: 16,
                padding: "32px 28px",
                border: "1px solid rgba(15,23,42,0.06)",
              }}
            >
              {children}
            </Section>

            <Hr
              style={{
                borderColor: "rgba(15,23,42,0.08)",
                marginTop: 24,
                marginBottom: 16,
              }}
            />
            <Text
              style={{
                fontSize: 11,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                margin: 0,
                textAlign: "center",
              }}
            >
              Foursquare Gospel Church · Cement Missionary HQ · Lagos
            </Text>
            <Text
              style={{
                fontSize: 11,
                color: "#94a3b8",
                margin: "6px 0 24px",
                textAlign: "center",
              }}
            >
              skillup@fgccement.org
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}

export const palette = {
  navy: "#0F172A",
  blue: "#003DA5",
  blueDark: "#00307F",
  gold: "#F59E0B",
  goldDark: "#D97706",
  coral: "#DC2626",
  cream: "#FAFAF8",
  creamMid: "#F3F3EE",
  muted: "#64748b",
};
