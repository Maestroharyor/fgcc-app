"use client";

import { Send } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import type { DBTrack } from "@/lib/db/types";

interface Props {
  tracks: DBTrack[];
}

interface PreviewResult {
  recipients: number;
}

interface SendResult {
  ok: boolean;
  sent?: number;
  failed?: number;
  error?: string;
}

export function BulkSMSComposer({ tracks }: Props) {
  const [audience, setAudience] = useState<"all" | "track" | "attended">("all");
  const [trackId, setTrackId] = useState<string>("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const params = new URLSearchParams({ audience });
    if (audience === "track" && trackId) params.set("track_id", trackId);
    fetch(`/api/admin/sms/broadcast?${params.toString()}`)
      .then((r) => r.json())
      .then((d: PreviewResult) => setPreview(d))
      .catch(() => setPreview(null));
  }, [audience, trackId]);

  const onSend = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!message.trim()) return;
    if (!window.confirm(`Send to ${preview?.recipients ?? 0} recipients?`))
      return;
    setResult(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/sms/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audience,
          track_id: audience === "track" ? trackId : undefined,
          message,
        }),
      });
      const data = (await res.json()) as SendResult;
      setResult(data);
    });
  };

  const charsLeft = 160 - message.length;

  return (
    <form
      onSubmit={onSend}
      className="rounded-3xl border border-navy/8 bg-white p-6 sm:p-8 shadow-card flex flex-col gap-5"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
            Audience
          </span>
          <select
            className="form-input"
            value={audience}
            onChange={(e) => setAudience(e.target.value as typeof audience)}
          >
            <option value="all">All registrants</option>
            <option value="track">A specific track</option>
            <option value="attended">Only checked-in attendees</option>
          </select>
        </label>
        {audience === "track" && (
          <label className="flex flex-col gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
              Track
            </span>
            <select
              className="form-input"
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
            >
              <option value="">Pick a track…</option>
              {tracks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-navy/60">
          Message
        </span>
        <textarea
          rows={4}
          maxLength={160}
          className="form-input"
          placeholder="Don't forget to bring your laptop tomorrow at 9AM…"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <span
          className={`font-mono text-[10px] uppercase tracking-[0.18em] ${
            charsLeft < 20 ? "text-coral" : "text-navy/55"
          }`}
        >
          {charsLeft} characters left
        </span>
      </label>

      <div className="flex items-center justify-between gap-3 border-t border-navy/8 pt-4">
        <div className="text-sm text-navy/65">
          Recipients:{" "}
          <strong className="text-navy">{preview?.recipients ?? "—"}</strong>
        </div>
        <button
          type="submit"
          disabled={
            pending ||
            message.trim().length === 0 ||
            (audience === "track" && !trackId)
          }
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 font-display text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden />
          {pending ? "Sending…" : "Send broadcast"}
        </button>
      </div>

      {result && (
        <div
          className={`rounded-2xl p-3 text-sm ${
            result.ok
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-coral/8 text-coral border border-coral/30"
          }`}
        >
          {result.ok
            ? `Sent ${result.sent}${result.failed ? ` · failed ${result.failed}` : ""}`
            : `Broadcast failed: ${result.error}`}
        </div>
      )}
    </form>
  );
}
