"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface CheckinResult {
  ok: boolean;
  alreadyChecked?: boolean;
  /** Distinct days checked in, including today's. */
  daysAttended?: number;
  registrant?: {
    referenceNumber: string;
    fullName: string;
    trackName: string;
  };
  error?: string;
}

interface Props {
  reference: string;
  attended: boolean;
}

/**
 * Profile-page check-in. Mirrors `CheckinForm` on /admin/checkin: fetches the
 * same route and shows inline feedback instead of letting a native form submit
 * navigate the browser to the raw JSON response. `router.refresh()` updates the
 * server-rendered "Attended" rows in place on success.
 */
export function CheckinButton({ reference, attended }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckinResult | null>(null);

  const checkIn = () => {
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_number: reference }),
      });
      const data = (await res
        .json()
        .catch(() => ({ ok: false }))) as CheckinResult;
      setResult(data);
      if (data.ok) router.refresh();
    });
  };

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        type="button"
        onClick={checkIn}
        disabled={pending}
        className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-60"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {pending
          ? "Checking in…"
          : attended
            ? "Check in for today"
            : "Mark attended"}
      </button>

      {result && (
        <div
          className={`w-full max-w-md rounded-2xl border p-4 ${
            result.ok
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : result.alreadyChecked
                ? "border-gold/30 bg-gold/8 text-gold-600"
                : "border-coral/30 bg-coral/8 text-coral"
          }`}
        >
          {result.ok && result.registrant && (
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <div>
                <div className="font-display font-semibold">
                  {result.registrant.fullName} · {result.registrant.trackName}
                </div>
                <div className="font-sans text-xs">
                  {result.registrant.referenceNumber} marked present
                  {result.daysAttended && result.daysAttended > 1
                    ? ` · day ${result.daysAttended}`
                    : ""}
                </div>
              </div>
            </div>
          )}
          {!result.ok && (
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5" aria-hidden />
              <div>
                <div className="font-display font-semibold">
                  {result.alreadyChecked
                    ? "Already checked in today"
                    : "Couldn't check in"}
                </div>
                {result.registrant && (
                  <div className="font-sans text-xs">
                    {result.registrant.referenceNumber} ·{" "}
                    {result.registrant.fullName}
                  </div>
                )}
                {result.error && !result.registrant && (
                  <div className="text-xs">{result.error}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
