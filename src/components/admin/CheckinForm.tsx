"use client";

import { CheckCircle2, ScanLine, XCircle } from "lucide-react";
import { useState, useTransition } from "react";

interface CheckinResult {
  ok: boolean;
  alreadyChecked?: boolean;
  registrant?: {
    referenceNumber: string;
    fullName: string;
    trackName: string;
  };
  error?: string;
}

export function CheckinForm() {
  const [pending, startTransition] = useTransition();
  const [ref, setRef] = useState("");
  const [result, setResult] = useState<CheckinResult | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference_number: ref.trim().toUpperCase() }),
      });
      const data = (await res.json()) as CheckinResult;
      setResult(data);
      if (data.ok) setRef("");
    });
  };

  return (
    <div className="rounded-3xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Reference number
          </span>
          <div className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-navy/55" aria-hidden />
            <input
              placeholder="SKU-UXD-001"
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              className="form-input"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={pending || ref.length < 5}
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-6 font-display font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {pending ? "Checking in…" : "Mark present"}
        </button>
      </form>

      {result && (
        <div
          className={`mt-6 rounded-2xl border p-4 ${
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
                    ? "Already checked in"
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
