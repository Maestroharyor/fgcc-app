"use client";

import { Send, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface ScheduleDay {
  dateKey: string;
  scheduled: number;
  sent: number;
  failed: number;
  total: number;
}

interface Props {
  days: ScheduleDay[];
  /** Today's Lagos key - batches on/before it are due to send. */
  todayKey: string;
}

function fmt(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00+01:00`).toLocaleDateString("en-NG", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function CertificateScheduleView({ days, todayKey }: Props) {
  const router = useRouter();
  const [running, startRun] = useTransition();
  const [clearing, startClear] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const pendingTotal = days.reduce((n, d) => n + d.scheduled + d.failed, 0);
  const dueNow = days
    .filter((d) => d.dateKey <= todayKey)
    .reduce((n, d) => n + d.scheduled + d.failed, 0);

  const runNow = () => {
    setMessage(null);
    startRun(async () => {
      const res = await fetch("/api/admin/certificates/run", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok: boolean;
        sent?: number;
        failed?: number;
        due?: number;
        error?: string;
      };
      setMessage(
        data.ok
          ? `Sent ${data.sent ?? 0}${data.failed ? ` · failed ${data.failed}` : ""} (of ${data.due ?? 0} due).`
          : (data.error ?? "Run failed"),
      );
      router.refresh();
    });
  };

  const cancel = () => {
    setConfirmCancel(false);
    setMessage(null);
    startClear(async () => {
      const res = await fetch("/api/admin/certificates/schedule", {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        ok: boolean;
        cleared?: number;
        error?: string;
      };
      setMessage(
        data.ok
          ? `Cleared ${data.cleared ?? 0} scheduled.`
          : (data.error ?? "Could not cancel"),
      );
      router.refresh();
    });
  };

  if (days.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-navy/15 bg-white p-6 text-sm text-navy/55">
        Nothing scheduled yet. Use the panel above to queue a send.
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-navy">
          Schedule
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={runNow}
            disabled={running || dueNow === 0}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 font-display text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
            title={
              dueNow === 0
                ? "Nothing is due today"
                : `${dueNow} due today (and earlier)`
            }
          >
            <Send className="h-4 w-4" aria-hidden />
            {running
              ? "Sending…"
              : `Send due batch now${dueNow ? ` (${dueNow})` : ""}`}
          </button>
          <button
            type="button"
            onClick={() => setConfirmCancel(true)}
            disabled={clearing || pendingTotal === 0}
            className="inline-flex items-center gap-2 rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" aria-hidden /> Cancel schedule
          </button>
        </div>
      </div>

      {message && <p className="mt-3 text-sm text-navy/70">{message}</p>}

      <div className="mt-4 overflow-hidden rounded-xl border border-navy/8">
        <table className="min-w-full text-sm">
          <thead className="bg-cream-100">
            <tr className="text-left font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
              <th className="px-4 py-2.5">Day</th>
              <th className="px-4 py-2.5">Scheduled</th>
              <th className="px-4 py-2.5">Sent</th>
              <th className="px-4 py-2.5">Failed</th>
              <th className="px-4 py-2.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.dateKey} className="border-t border-navy/6">
                <td className="px-4 py-2.5 font-display font-medium text-navy">
                  {fmt(d.dateKey)}
                  {d.dateKey <= todayKey && d.scheduled + d.failed > 0 && (
                    <span className="ml-2 rounded-full bg-primary/8 px-2 py-0.5 font-sans text-[9px] uppercase tracking-[0.16em] text-primary">
                      Due
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-navy/70">{d.scheduled}</td>
                <td className="px-4 py-2.5 text-emerald-700">{d.sent}</td>
                <td className="px-4 py-2.5 text-red-700">{d.failed}</td>
                <td className="px-4 py-2.5 text-navy">{d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmCancel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-navy/50"
            onClick={() => setConfirmCancel(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="font-display text-lg font-semibold text-navy">
              Cancel the schedule?
            </h2>
            <p className="mt-1.5 text-sm text-navy/65">
              This un-queues every scheduled (not-yet-sent) certificate.
              Already-sent certificates are unaffected.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="inline-flex items-center rounded-full border border-navy/15 bg-white px-4 py-2 font-display text-sm font-semibold text-navy hover:bg-cream-100"
              >
                Keep schedule
              </button>
              <button
                type="button"
                onClick={cancel}
                className="inline-flex items-center gap-2 rounded-full bg-coral px-4 py-2 font-display text-sm font-semibold text-white hover:bg-coral/90"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Cancel schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
