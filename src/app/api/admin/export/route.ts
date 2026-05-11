import { type NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/require-role";
import { buildCsv } from "@/lib/csv/export";
import { listRegistrations } from "@/lib/db/registrations";
import { listTracks } from "@/lib/db/tracks";
import { buildXlsx } from "@/lib/excel/export";
import { buildPrintableList } from "@/lib/pdf/printable-list";

export async function GET(request: NextRequest) {
  await requireRole("admin");

  const sp = request.nextUrl.searchParams;
  const format = (sp.get("format") ?? "csv").toLowerCase();
  const query = sp.get("q") ?? undefined;
  const trackId = sp.get("track") ?? undefined;
  const type = (sp.get("type") as "self" | "others" | null) ?? undefined;
  const attendedParam = sp.get("attended");
  const attended =
    attendedParam === "yes" ? true : attendedParam === "no" ? false : undefined;

  const [{ rows }, tracks] = await Promise.all([
    listRegistrations({
      query,
      trackId: trackId ?? undefined,
      type: type ?? undefined,
      attended,
      page: 1,
      pageSize: 5000,
    }),
    listTracks(),
  ]);
  const tracksById = new Map(tracks.map((t) => [t.id, t]));
  const decorated = rows.map((r) => ({
    ...r,
    track_name: tracksById.get(r.track_id)?.name ?? "",
  }));

  if (format === "xlsx") {
    const buf = await buildXlsx(decorated, [
      {
        header: "Reference",
        key: "reference_number",
        width: 18,
        value: (r) => r.reference_number,
      },
      {
        header: "Full name",
        key: "full_name",
        width: 26,
        value: (r) => r.full_name,
      },
      { header: "Email", key: "email", width: 28, value: (r) => r.email },
      { header: "Phone", key: "phone", width: 18, value: (r) => r.phone },
      {
        header: "Track",
        key: "track_name",
        width: 30,
        value: (r) => r.track_name,
      },
      { header: "Gender", key: "gender", width: 10, value: (r) => r.gender },
      {
        header: "Age group",
        key: "age_group",
        width: 12,
        value: (r) => r.age_group,
      },
      {
        header: "Church",
        key: "church",
        width: 24,
        value: (r) => r.church ?? "",
      },
      {
        header: "Type",
        key: "registered_via",
        width: 12,
        value: (r) => r.registered_via,
      },
      {
        header: "Attended",
        key: "attended",
        width: 10,
        value: (r) => (r.attended ? "Yes" : "No"),
      },
      {
        header: "Registered at",
        key: "created_at",
        width: 22,
        value: (r) => new Date(r.created_at),
      },
    ]);
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="skillup-registrations.xlsx"',
      },
    });
  }

  if (format === "pdf") {
    const buf = buildPrintableList(
      "SkillUp 1.0 — Registrations",
      `${decorated.length} records · ${new Date().toLocaleString()}`,
      decorated,
      [
        { header: "Reference", width: 32, value: (r) => r.reference_number },
        { header: "Name", width: 55, value: (r) => r.full_name },
        { header: "Email", width: 60, value: (r) => r.email },
        { header: "Phone", width: 40, value: (r) => r.phone },
        { header: "Track", width: 60, value: (r) => r.track_name },
        {
          header: "Attended",
          width: 25,
          value: (r) => (r.attended ? "Yes" : "No"),
        },
      ],
    );
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition":
          'attachment; filename="skillup-registrations.pdf"',
      },
    });
  }

  // CSV default
  const csv = buildCsv(decorated, [
    { header: "Reference", value: (r) => r.reference_number },
    { header: "Full name", value: (r) => r.full_name },
    { header: "Email", value: (r) => r.email },
    { header: "Phone", value: (r) => r.phone },
    { header: "Track", value: (r) => r.track_name },
    { header: "Gender", value: (r) => r.gender },
    { header: "Age group", value: (r) => r.age_group },
    { header: "Church", value: (r) => r.church ?? "" },
    { header: "Type", value: (r) => r.registered_via },
    { header: "Attended", value: (r) => (r.attended ? "Yes" : "No") },
    { header: "Registered at", value: (r) => r.created_at },
  ]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="skillup-registrations.csv"',
    },
  });
}
