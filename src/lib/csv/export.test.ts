import { describe, expect, it } from "vitest";
import { buildCsv } from "./export";

interface Row {
  name: string;
  email: string;
  note: string | null;
}

const columns = [
  { header: "Name", value: (r: Row) => r.name },
  { header: "Email", value: (r: Row) => r.email },
  { header: "Note", value: (r: Row) => r.note },
];

describe("buildCsv", () => {
  it("produces a header row + body terminated with CRLF", () => {
    const rows: Row[] = [{ name: "Ada", email: "ada@example.com", note: "ok" }];
    const csv = buildCsv(rows, columns);
    expect(csv).toBe("Name,Email,Note\r\nAda,ada@example.com,ok\r\n");
  });

  it("escapes commas by wrapping in double quotes", () => {
    const rows: Row[] = [{ name: "Doe, Jane", email: "j@x.com", note: null }];
    const csv = buildCsv(rows, columns);
    expect(csv).toContain('"Doe, Jane"');
  });

  it("escapes embedded quotes by doubling them", () => {
    const rows: Row[] = [{ name: 'Say "hi"', email: "x@x.com", note: null }];
    expect(buildCsv(rows, columns)).toContain('"Say ""hi"""');
  });

  it("escapes embedded newlines", () => {
    const rows: Row[] = [{ name: "Multi\nline", email: "x@x.com", note: null }];
    expect(buildCsv(rows, columns)).toContain('"Multi\nline"');
  });

  it("renders null/undefined as empty", () => {
    const rows: Row[] = [{ name: "A", email: "a@x.com", note: null }];
    expect(buildCsv(rows, columns)).toContain("A,a@x.com,\r\n");
  });

  it("handles an empty row list", () => {
    const csv = buildCsv([] as Row[], columns);
    expect(csv).toBe("Name,Email,Note\r\n\r\n");
  });
});
