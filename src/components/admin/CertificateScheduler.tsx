"use client";

import { CalendarClock, Loader2, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { TrackSelect } from "@/components/forms/TrackSelect";

interface TrackOption {
  code: string;
  name: string;
}

interface PreviewRecipient {
  reference_number: string;
  full_name: string;
  email: string;
  track_code: string;
  via_registrar?: boolean;
}

interface Props {
  tracks: TrackOption[];
  /** Lagos datetime-local defaults (`yyyy-MM-ddTHH:mm`): tomorrow 09:00, min now. */
  defaultStartAt: string;
  minStartAt: string;
}

interface DayPlan {
  date: Date;
  count: number;
}

/** Client-side mirror of `planSchedule` for the preview - server is authoritative. */
function planDays(count: number, perDay: number, startAt: string): DayPlan[] {
  if (count <= 0 || perDay <= 0) return [];
  const out: DayPlan[] = [];
  let remaining = count;
  let offset = 0;
  while (remaining > 0) {
    // Interpret the naive datetime-local value as Lagos (+01:00).
    const d = new Date(`${startAt}:00+01:00`);
    d.setDate(d.getDate() + offset);
    out.push({ date: d, count: Math.min(perDay, remaining) });
    remaining -= Math.min(perDay, remaining);
    offset += 1;
  }
  return out;
}

export function CertificateScheduler({
  tracks,
  defaultStartAt,
  minStartAt,
}: Props) {
  const router = useRouter();
  const [trackCode, setTrackCode] = useState("");
  const [perDay, setPerDay] = useState(90);
  const [startAt, setStartAt] = useState(defaultStartAt);

  const [includeRegistrar, setIncludeRegistrar] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [viaRegistrar, setViaRegistrar] = useState(0);
  const [noEmail, setNoEmail] = useState(0);
  const [recipients, setRecipients] = useState<PreviewRecipient[]>([]);
  const [showList, setShowList] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  // Refresh the audience preview whenever the track filter or registrar toggle changes.
  useEffect(() => {
    const controller = new AbortController();
    setLoadingPreview(true);
    const params = new URLSearchParams();
    if (trackCode) params.set("track", trackCode);
    if (includeRegistrar) params.set("registrar", "1");
    fetch(`/api/admin/certificates/preview?${params}`, {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then(
        (data: {
          count: number;
          viaRegistrar: number;
          noEmail: number;
          recipients: PreviewRecipient[];
        }) => {
          setCount(data.count);
          setViaRegistrar(data.viaRegistrar ?? 0);
          setNoEmail(data.noEmail ?? 0);
          setRecipients(data.recipients ?? []);
        },
      )
      .catch(() => {})
      .finally(() => setLoadingPreview(false));
    return () => controller.abort();
  }, [trackCode, includeRegistrar]);

  const plan = planDays(count ?? 0, perDay, startAt);

  const schedule = () => {
    setMessage(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/certificates/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackCode: trackCode || undefined,
          perDay,
          startAt,
          includeRegistrar,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        totalRecipients?: number;
        error?: string;
      };
      if (data.ok) {
        setMessage(`Scheduled ${data.totalRecipients} certificate(s).`);
        router.refresh();
      } else {
        setMessage(data.error ?? "Could not schedule");
      }
    });
  };

  const canSchedule = (count ?? 0) > 0 && perDay >= 1 && !pending;

  return (
    <div className="rounded-2xl border border-navy/8 bg-white p-6 shadow-card">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
        <h3 className="font-display text-base font-semibold text-navy">
          Schedule a send
        </h3>
      </div>
      <p className="mt-1 text-sm text-navy/65">
        Everyone who attended (any day) and has an email is eligible.
        Certificates go out in daily batches to stay under Resend&apos;s 100/day
        cap - set a per-day count and a start date &amp; time and we&apos;ll
        split the work, sending at that time each day.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="block">
          <span
            id="cert-track-label"
            className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55"
          >
            Track
          </span>
          <div className="mt-2">
            <TrackSelect
              options={tracks}
              value={trackCode}
              onChange={setTrackCode}
              allLabel="All tracks"
              aria-labelledby="cert-track-label"
            />
          </div>
        </div>

        <label className="block">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
            Per day (max 95)
          </span>
          <input
            type="number"
            min={1}
            max={95}
            value={perDay}
            onChange={(e) =>
              setPerDay(Math.max(1, Math.min(95, Number(e.target.value) || 1)))
            }
            className="form-input mt-2"
          />
        </label>

        <label className="block">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-navy/55">
            Start date &amp; time
          </span>
          <input
            type="datetime-local"
            min={minStartAt}
            value={startAt}
            onChange={(e) => setStartAt(e.target.value)}
            className="form-input mt-2"
          />
        </label>
      </div>

      <label className="mt-4 flex items-start gap-2.5 text-sm text-navy/80">
        <input
          type="checkbox"
          checked={includeRegistrar}
          onChange={(e) => setIncludeRegistrar(e.target.checked)}
          className="mt-0.5 h-4 w-4"
        />
        <span>
          Send no-email participants&apos; certificates to whoever registered
          them
          <span className="block text-xs text-navy/55">
            Routes offline registrants (registered by someone else) to that
            person&apos;s email. Those without a registrar stay print-only.
          </span>
        </span>
      </label>

      <div className="mt-5 rounded-xl border border-navy/8 bg-cream/50 p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-sm text-navy">
            <Users className="h-4 w-4 text-primary" aria-hidden />
            {loadingPreview ? (
              <span className="inline-flex items-center gap-1 text-navy/60">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Counting…
              </span>
            ) : (
              <span>
                <strong>{count ?? 0}</strong> eligible by email
                {includeRegistrar && viaRegistrar > 0 && (
                  <span className="text-navy/55">
                    {" "}
                    · {viaRegistrar} via registrar
                  </span>
                )}
                {noEmail > 0 && (
                  <span className="text-navy/55">
                    {" "}
                    · {noEmail} still no email (use Download ZIP to print)
                  </span>
                )}
              </span>
            )}
          </span>
          {recipients.length > 0 && (
            <button
              type="button"
              onClick={() => setShowList((s) => !s)}
              className="font-display text-xs font-semibold text-primary hover:underline"
            >
              {showList ? "Hide list" : "See recipients"}
            </button>
          )}
        </div>

        {plan.length > 0 && (
          <p className="mt-2 text-sm text-navy/70">
            {count} ÷ {perDay}/day ={" "}
            <strong>
              {plan.length} day{plan.length === 1 ? "" : "s"}
            </strong>
            {" · "}
            {plan
              .map(
                (p) =>
                  `${p.date.toLocaleString("en-NG", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: "Africa/Lagos",
                  })}: ${p.count}`,
              )
              .join(" · ")}
          </p>
        )}

        {showList && (
          <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-navy/8 bg-white">
            <table className="min-w-full text-xs">
              <tbody>
                {recipients.map((r) => (
                  <tr
                    key={r.reference_number}
                    className="border-t border-navy/6"
                  >
                    <td className="px-3 py-1.5 font-sans text-primary">
                      {r.reference_number}
                    </td>
                    <td className="px-3 py-1.5 text-navy">{r.full_name}</td>
                    <td className="px-3 py-1.5 text-navy/60">
                      {r.email}
                      {r.via_registrar && (
                        <span className="ml-1.5 rounded-full bg-primary/8 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.14em] text-primary">
                          registrar
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={schedule}
          disabled={!canSchedule}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
        >
          <CalendarClock className="h-4 w-4" aria-hidden />
          {pending ? "Scheduling…" : "Schedule send"}
        </button>
        {message && <span className="text-sm text-navy/70">{message}</span>}
      </div>
    </div>
  );
}
