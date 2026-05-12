import { env } from "@/lib/utils/env";

const TERMII_ENDPOINT = "https://api.termii.com/api/sms/send";

export interface TermiiResponse {
  ok: boolean;
  message_id?: string;
  message?: string;
  raw?: unknown;
}

export async function sendSMS({
  to,
  message,
}: {
  to: string;
  message: string;
}): Promise<TermiiResponse> {
  if (!env.TERMII_API_KEY) {
    console.warn("[sms] TERMII_API_KEY missing - skipping send to", to);
    return { ok: false, message: "termii-not-configured" };
  }
  try {
    const res = await fetch(TERMII_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: normaliseNigerianPhone(to),
        from: env.TERMII_SENDER_ID,
        sms: message,
        type: "plain",
        channel: "generic",
        api_key: env.TERMII_API_KEY,
      }),
    });
    const data = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      return {
        ok: false,
        message:
          typeof data.message === "string"
            ? data.message
            : `HTTP ${res.status}`,
        raw: data,
      };
    }
    return {
      ok: true,
      message_id:
        typeof data.message_id === "string" ? data.message_id : undefined,
      raw: data,
    };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "termii-failed",
    };
  }
}

export async function sendBulkSMS(
  recipients: Array<{ to: string; message: string }>,
  {
    batchSize = 50,
    delayMs = 500,
  }: { batchSize?: number; delayMs?: number } = {},
): Promise<TermiiResponse[]> {
  const results: TermiiResponse[] = [];
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(batch.map(sendSMS));
    for (const r of batchResults) {
      results.push(
        r.status === "fulfilled"
          ? r.value
          : { ok: false, message: "promise-rejected" },
      );
    }
    if (i + batchSize < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  return results;
}

/**
 * Lightweight Nigerian phone normaliser. Strips spaces/dashes, converts 0…
 * → +234… and leaves anything else alone (Termii accepts E.164).
 */
export function normaliseNigerianPhone(input: string): string {
  const cleaned = input.replace(/[^\d+]/g, "");
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("234")) return `+${cleaned}`;
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }
  return cleaned;
}
