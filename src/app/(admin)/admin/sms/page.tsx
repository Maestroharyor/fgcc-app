import type { Metadata } from "next";
import { BulkSMSComposer } from "@/components/admin/BulkSMSComposer";
import { requireRole } from "@/lib/auth/require-role";
import { listTracks } from "@/lib/db/tracks";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "SMS broadcast · SkillUp Admin",
  robots: { index: false, follow: false },
};

export default async function AdminSMSPage() {
  await requireRole("superadmin");
  const tracks = await listTracks();
  return (
    <div className="px-6 md:px-10 py-10">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
        Superadmin · SMS
      </span>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-navy">
        Bulk SMS broadcast
      </h1>
      <p className="mt-1 text-sm text-navy/65">
        Termii generic numeric route. ~₦18 per message. 160-char limit. DND
        numbers are not delivered on this route.
      </p>
      <div className="mt-6 max-w-2xl">
        <BulkSMSComposer tracks={tracks} />
      </div>
    </div>
  );
}
