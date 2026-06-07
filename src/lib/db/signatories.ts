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

/** Mirrors the rows seeded by the migration; used when the DB is unreachable
 *  so certificates always render both signature blocks. */
const DEFAULT_SIGNATORIES: Array<Pick<DBSignatory, "slot" | "name" | "title">> =
  [
    { slot: "chairman", name: "", title: "Chairman, Planning Committee" },
    { slot: "convener", name: "", title: "Programme Convener" },
  ];

const SLOT_ORDER: Record<SignatorySlot, number> = { chairman: 0, convener: 1 };

export async function getSignatories(): Promise<DBSignatory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("certificate_signatories")
    .select("slot, name, title, image_path, updated_at");
  if (error || !data || data.length === 0) {
    return DEFAULT_SIGNATORIES.map((d) => ({
      ...d,
      image_path: null,
      updated_at: "",
    }));
  }
  const rows = data as DBSignatory[];
  return [...rows].sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
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
 * Rows + downloaded signature PNGs, ready for `buildCertificate`. Any failure
 * (missing env, missing object) degrades to a plain signature line.
 */
export async function loadCertificateSignatories(): Promise<
  CertificateSignatoryData[]
> {
  const rows = await getSignatories();
  return Promise.all(
    rows.map(async (row) => ({
      name: row.name,
      title: row.title,
      image: row.image_path
        ? await downloadSignatureImage(row.image_path)
        : null,
    })),
  );
}
