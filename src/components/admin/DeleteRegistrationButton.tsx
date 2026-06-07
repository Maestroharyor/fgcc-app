"use client";

import { Trash2, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ActionCodeModal } from "./ActionCodeModal";

interface Props {
  id: string;
  fullName: string;
  reference: string;
}

/**
 * Superadmin-only permanent delete, gated by an email confirmation code.
 * The route enforces requireRole("superadmin") + RLS; this button is only
 * rendered for superadmins as a UX nicety.
 */
export function DeleteRegistrationButton({ id, fullName, reference }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const requestCode = async () => {
    const res = await fetch(`/api/admin/registrations/${id}/delete`, {
      method: "POST",
    });
    return (await res.json().catch(() => ({ ok: false }))) as {
      ok: boolean;
      error?: string;
    };
  };

  const confirm = async (code: string) => {
    const res = await fetch(`/api/admin/registrations/${id}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json().catch(() => ({ ok: false }))) as {
      ok: boolean;
      error?: string;
    };
    if (data.ok) {
      router.push("/admin/registrations");
      router.refresh();
    }
    return data;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-coral/30 bg-white px-4 py-2 font-display text-sm font-semibold text-coral hover:bg-coral/8"
      >
        <Trash2 className="h-4 w-4" aria-hidden /> Delete registration
      </button>
      {open && (
        <ActionCodeModal
          title="Delete this registration?"
          description={`${fullName} (${reference}) will be permanently removed, including their check-ins and reference number.`}
          confirmLabel="Delete permanently"
          tone="coral"
          onRequestCode={requestCode}
          onConfirm={confirm}
          onClose={() => setOpen(false)}
        >
          <div className="flex items-start gap-3 rounded-xl border border-coral/20 bg-coral/5 p-4">
            <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coral/10 text-coral">
              <TriangleAlert className="h-5 w-5" aria-hidden />
            </span>
            <p className="text-sm text-navy/75">
              This can&apos;t be undone. To continue, we&apos;ll email a
              confirmation code to your admin address.
            </p>
          </div>
        </ActionCodeModal>
      )}
    </>
  );
}
