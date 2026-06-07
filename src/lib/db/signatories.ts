import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SignatorySlot = "chairman" | "convener";

export interface DBSignatory {
  slot: SignatorySlot;
  name: string;
  title: string;
  image_path: string | null;
  updated_at: string;
}

/** Shape consumed by `buildCertificate` — image already downloaded. */
export interface CertificateSignatoryData {
  name: string;
  title: string;
  image: Buffer | null;
}

export const SIGNATURE_BUCKET = "certificates";

/** Mirrors the chairman row seeded by the migration; used when the DB is
 *  unreachable so certificates always render a signature block. */
const DEFAULT_SIGNATORY: Pick<DBSignatory, "slot" | "name" | "title"> = {
  slot: "chairman",
  name: "",
  title: "Chairman, Planning Committee",
};

/** The chairman is the only signatory printed on certificates. */
export async function getSignatory(): Promise<DBSignatory> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("certificate_signatories")
    .select("slot, name, title, image_path, updated_at")
    .eq("slot", "chairman");
  const row = (data as DBSignatory[] | null)?.[0];
  if (error || !row) {
    return { ...DEFAULT_SIGNATORY, image_path: null, updated_at: "" };
  }
  return row;
}

export async function upsertSignatory(
  slot: SignatorySlot,
  fields: { name: string; title: string; image_path?: string },
): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("certificate_signatories").upsert(
      {
        slot,
        name: fields.name,
        title: fields.title,
        ...(fields.image_path ? { image_path: fields.image_path } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "slot" },
    );
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false, error: "storage-not-configured" };
  }
}

export async function uploadSignatureImage(
  slot: SignatorySlot,
  png: Buffer,
): Promise<{ ok: boolean; path?: string; error?: string }> {
  try {
    const supabase = createSupabaseAdminClient();
    const path = `signatures/${slot}.png`;
    const { error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .upload(path, png, { contentType: "image/png", upsert: true });
    if (error) return { ok: false, error: error.message };
    return { ok: true, path };
  } catch {
    return { ok: false, error: "storage-not-configured" };
  }
}

/** 1-hour signed URL for the admin page <img> preview. */
export async function getSignatureSignedUrl(
  imagePath: string,
): Promise<string | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .createSignedUrl(imagePath, 3600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}

async function downloadSignatureImage(
  imagePath: string,
): Promise<Buffer | null> {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .download(imagePath);
    if (error || !data) return null;
    return Buffer.from(await data.arrayBuffer());
  } catch {
    return null;
  }
}

/**
 * Chairman row + downloaded signature PNG, ready for `buildCertificate`. Any
 * failure (missing env, missing object) degrades to a plain signature line.
 */
export async function loadCertificateSignatory(): Promise<CertificateSignatoryData> {
  const row = await getSignatory();
  return {
    name: row.name,
    title: row.title,
    image: row.image_path ? await downloadSignatureImage(row.image_path) : null,
  };
}
