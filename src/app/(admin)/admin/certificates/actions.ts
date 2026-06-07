"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { uploadSignatureImage, upsertSignatory } from "@/lib/db/signatories";
import { SignatorySchema } from "@/lib/validation/schemas";

export interface SignatoryActionResult {
  ok: boolean;
  error?: string;
}

const MAX_SIGNATURE_BYTES = 1_000_000; // 1 MB is plenty for a signature scan.
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

export async function updateSignatory(
  formData: FormData,
): Promise<SignatoryActionResult> {
  await requireRole("superadmin");

  const parsed = SignatorySchema.safeParse({
    slot: formData.get("slot"),
    name: formData.get("name") ?? "",
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid signatory details",
    };
  }

  let imagePath: string | undefined;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_SIGNATURE_BYTES) {
      return { ok: false, error: "Signature image must be under 1 MB" };
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!bytes.subarray(0, 4).equals(PNG_MAGIC)) {
      return { ok: false, error: "Signature must be a PNG image" };
    }
    const upload = await uploadSignatureImage(parsed.data.slot, bytes);
    if (!upload.ok) {
      return { ok: false, error: upload.error ?? "Upload failed" };
    }
    imagePath = upload.path;
  }

  const result = await upsertSignatory(parsed.data.slot, {
    name: parsed.data.name,
    title: parsed.data.title,
    ...(imagePath ? { image_path: imagePath } : {}),
  });
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Could not save signatory" };
  }

  revalidatePath("/admin/certificates");
  return { ok: true };
}
