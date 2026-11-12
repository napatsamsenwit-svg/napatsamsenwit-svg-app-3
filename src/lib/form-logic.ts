import type { Col, Field, Section } from "@/lib/form-schema";

/** ค่าของตาราง: หนึ่งแถว = คีย์คอลัมน์ → ข้อความ */
export type Row = Record<string, string>;
export type FieldValue = string | string[] | Row[];

/** ข้อมูลของหนึ่งหัวข้อ (เก็บเป็น jsonb ใน plan_sections.data) */
export type SectionData = {
  [key: string]: FieldValue | Record<string, string> | boolean | undefined;
  /** ความต้องการเพิ่มเติมสำหรับ AI ของหัวข้อนี้ */
  _req?: string;
  /** ผลจริงของ KPI (ใช้เฉพาะหัวข้อ kpis): คีย์ = "รหัส|ชื่อ KPI" */
  _act?: Record<string, string>;
  /** ข้อมูลตัวอย่าง (ล้างได้ด้วยปุ่ม "ล้างข้อมูลตัวอย่าง") */
  _sample?: boolean;
};

const LEGACY_FISHBONE: [string, string][] = [
  ["man", "คน (Man)"],
  ["machine", "เครื่องมือและระบบ (Machine)"],
  ["method", "วิธีการทำงาน (Method)"],
  ["material", "สินค้าและวัตถุดิบ (Material)"],
  ["measurement", "การวัดผล (Measurement)"],
  ["environment", "สภาพแวดล้อม (Environment)"],
];

const str = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

export function normCell(c: Col | Field, v: unknown): string {
  let x = str(v).trim();
  if (c.type === "select" && x && c.options && !c.options.includes(x)) {
    const key = (s: string) => s.toLowerCase().replace(/,/g, "").replace(/[–—]/g, "-");
    const lx = key(x);
    const hit = c.options.find((o) => key(o) === lx || key(o).startsWith(lx) || lx.startsWith(key(o)));
    x = hit ?? ("keep" in c && c.keep ? x : "");
  }
  if (c.type === "number" && x) {
    const n = parseFloat(x.replace(/[,%\s]/g, ""));
    x = Number.isNaN(n) ? "" : String(n);
  }
  return x;
}

export function normField(f: Field, v: unknown): FieldValue {
  if (f.type === "list") {
    if (Array.isArray(v)) return v.map((x) => str(x).trim()).filter(Boolean);
    if (typeof v === "string") {
      return v
        .split("\n")
        .map((x) => x.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
        .filter(Boolean);
    }
    return [];
  }
  if (f.type === "table") {
    if (!Array.isArray(v)) return [];
    const cols = f.cols ?? [];
    return (v as unknown[])
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object")
      .map((r) => Object.fromEntries(cols.map((c) => [c.k, normCell(c, r[c.k])])) as Row)
      .filter((r) => cols.some((c) => r[c.k] !== ""));
  }
  return normCell(f, v);
}

export function emptyField(f: Field): FieldValue {
  return f.type === "list" || f.type === "table" ? [] : "";
}

export function emptySection(s: Section): SectionData {
  const d: SectionData = {};
  s.fields.forEach((f) => {
    if (f.type !== "cmpEdits") d[f.k] = emptyField(f);
  });
  return d;
}

/** ดึงข้อมูลที่เก็บไว้มาให้ตรงรูปแบบของหัวข้อ (ช่องที่หายไปเป็นค่าว่าง) */
export function normalizeSection(s: Section, raw: unknown): SectionData {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const d: SectionData = {};
  s.fields.forEach((f) => {
    if (f.type === "cmpEdits") return;
    const v = src[f.k];
    d[f.k] = v === undefined ? emptyField(f) : normField(f, v);
  });
  if (s.id === "fishbone" && !asRows(d.cats).length) {
    // แผนเก่าที่เก็บเป็น 6 หมวดตายตัว: แปลงเป็นหมวดแบบใหม่
    const old = LEGACY_FISHBONE.map(([k, name]) => ({ name, causes: normField({ k, label: name, type: "list" }, src[k]) as string[] }))
      .filter((c) => c.causes.length)
      .map((c) => ({ name: c.name, causes: c.causes.join("\n") }));
    if (old.length) d.cats = old;
  }
  if (typeof src._req === "string") d._req = src._req;
  if (src._act && typeof src._act === "object") d._act = src._act as Record<string, string>;
  if (src._sample === true) d._sample = true;
  return d;
}

export function hasVal(f: Field, v: unknown): boolean {
  if (f.type === "cmpEdits") return false;
  if (f.type === "list") return Array.isArray(v) && v.some((x) => String(x).trim());
  if (f.type === "table") {
    const cols = f.cols ?? [];
    return Array.isArray(v) && (v as Row[]).some((r) => cols.some((c) => String(r[c.k] ?? "").trim()));
  }
  return String(v ?? "").trim() !== "";
}

export const isFilled = (s: Section, d: SectionData | undefined) =>
  !!d && s.fields.some((f) => hasVal(f, d[f.k]));

export const asList = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
export const asRows = (v: unknown): Row[] => (Array.isArray(v) ? (v as Row[]) : []);
export const asText = (v: unknown): string => (typeof v === "string" ? v : "");

/* ---------- Google Maps ---------- */

export const MAP_URL =
  /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+\/|maps\.app\.goo\.gl\/|goo\.gl\/maps\/)/i;

const COORD = /^\s*\(?\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*\)?\s*$/;

/** วางพิกัด (13.68, 100.54) → แปลงเป็นลิงก์ Google Maps */
export function coordUrl(x: string): string {
  const m = COORD.exec(x || "");
  if (!m) return "";
  const a = +m[1];
  const b = +m[2];
  return Math.abs(a) <= 90 && Math.abs(b) <= 180 ? `https://www.google.com/maps?q=${a},${b}` : "";
}

export function mapState(v: string): { kind: "empty" } | { kind: "bad" } | { kind: "ok"; label: string; url: string } {
  const u = v.trim();
  if (!u) return { kind: "empty" };
  if (!MAP_URL.test(u)) return { kind: "bad" };
  const q = /[?&]q=(-?[\d.]+,-?[\d.]+)/.exec(u);
  return { kind: "ok", label: q ? "พิกัด " + q[1].replace(",", ", ") : u, url: u };
}

/* ---------- สรุปเป็นข้อความ (ใช้เป็นบริบทให้ AI และหน้าสรุป) ---------- */

const cellMd = (v: unknown) => String(v ?? "").replace(/\|/g, "\\|").replace(/\n+/g, "<br>");

export function sectionMd(s: Section, d: SectionData, statusText = "ฉบับร่าง"): string {
  let out = `## ${s.no}. ${s.th} (${s.en}) — ${statusText}\n\n`;
  s.fields.forEach((f) => {
    const v = d[f.k];
    if (!hasVal(f, v)) return;
    if (f.type === "list") {
      out += `**${f.label}:**\n${asList(v)
        .filter((x) => x.trim())
        .map((x) => "- " + x.trim())
        .join("\n")}\n\n`;
    } else if (f.type === "table") {
      const cols = f.cols ?? [];
      const rows = asRows(v).filter((r) => cols.some((c) => String(r[c.k] ?? "").trim()));
      out +=
        `| # | ${cols.map((c) => c.label).join(" | ")} |\n|---|${cols.map(() => "---").join("|")}|\n` +
        rows.map((r, i) => `| ${i + 1} | ${cols.map((c) => cellMd(r[c.k])).join(" | ")} |`).join("\n") +
        "\n\n";
    } else if (f.type === "textarea") {
      out += `**${f.label}:**\n${asText(v).trim()}\n\n`;
    } else {
      out += `**${f.label}:** ${asText(v).trim()}\n\n`;
    }
  });
  return out.trim();
}
