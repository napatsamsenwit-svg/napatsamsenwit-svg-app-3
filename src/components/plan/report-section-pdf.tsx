"use client";

import type { CSSProperties, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { asRows, type Row } from "@/lib/form-logic";
import type { ExportItem } from "@/lib/export-xlsx";
import { competencySource, type DictEntry } from "@/lib/competency";
import { kpiRows } from "@/lib/kpi";
import type { SectionStatus } from "@/lib/plan-status";
import { loadFonts } from "./canvas-exports";
import type { PdfProgress } from "./report-pdf";

/*
 * PDF แยกรายหัวข้อ (Key Role, KPI, Competency) หน้าตาตามตัวอย่าง "Output AI-ANNA":
 * หัวข้อสีเหลือง-กรมท่า + ตารางหัวกรมท่า + ท้ายหน้ามีชื่อบริษัทและเลขหน้า "หน้า x / N"
 */

export type SectionPdfKind = "roles" | "kpis" | "competency";
export const SECTION_PDF_NAME: Record<SectionPdfKind, string> = {
  roles: "Key_Roles",
  kpis: "KPI",
  competency: "Competency",
};

type Orient = "p" | "l";
const DIM: Record<Orient, { w: number; h: number }> = { p: { w: 794, h: 1123 }, l: { w: 1123, h: 794 } };
const PX = 40;
const TOP = 40;
const FOOT = 48;

const NAVY = "#1C244B";
const GOLD = "#F5E51E";
const GOLD_TEXT = "#7A6A00";
const INK = "#1D2140";
const GRAY = "#5A6285";
const LINE = "#C9CDE0";
const SOFT = "#EEF0F6";
const YELLOW_SOFT = "#FDF8C9";

const statusText = (s: SectionStatus) => (s === "approved" ? "อนุมัติแล้ว" : s === "review" ? "รอตรวจ" : s === "returned" ? "ส่งกลับแก้" : "ฉบับร่าง");

type Blk = { id: string; node: ReactNode; keepNext?: boolean; table?: boolean };

const cellBase: CSSProperties = {
  whiteSpace: "pre-wrap",
  overflowWrap: "anywhere",
  lineHeight: 1.6,
  padding: "7px 9px",
};

function Header({ item, total }: { item: ExportItem; total: number }) {
  const s = item.section;
  return (
    <div style={{ paddingBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GOLD_TEXT, letterSpacing: ".06em", lineHeight: 1.6 }}>
        หัวข้อ {s.no} จาก {total} · {statusText(item.status)}
      </div>
      <div style={{ fontSize: 30, fontWeight: 700, color: NAVY, lineHeight: 1.35 }}>{s.th}</div>
      <div style={{ fontSize: 15, color: GRAY, lineHeight: 1.5 }}>{s.en}</div>
      <div style={{ fontSize: 12.5, color: GRAY, lineHeight: 1.7, marginTop: 8, fontStyle: "italic" }}>{s.desc}</div>
      <div style={{ width: 54, height: 4, background: GOLD, marginTop: 6 }} />
    </div>
  );
}

type TCol = { k: string; label: string; fr: number; center?: boolean };

function THead({ cols }: { cols: TCol[] }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols.map((c) => `${c.fr}fr`).join(" "),
        background: NAVY,
        color: "#fff",
        fontSize: 12,
        fontWeight: 700,
        border: `1px solid ${NAVY}`,
      }}
    >
      {cols.map((c, i) => (
        <div key={c.k} style={{ ...cellBase, borderRight: i < cols.length - 1 ? "1px solid rgba(255,255,255,.3)" : 0 }}>
          {c.label}
        </div>
      ))}
    </div>
  );
}

function TRow({ cols, row, size }: { cols: TCol[]; row: Row; size: number }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: cols.map((c) => `${c.fr}fr`).join(" "),
        fontSize: size,
        color: INK,
        border: `1px solid ${LINE}`,
        borderTop: 0,
      }}
    >
      {cols.map((c, i) => (
        <div
          key={c.k}
          style={{ ...cellBase, borderRight: i < cols.length - 1 ? `1px solid ${LINE}` : 0, textAlign: c.center ? "center" : "left" }}
        >
          {(row[c.k] ?? "").trim()}
        </div>
      ))}
    </div>
  );
}

const ROLE_COLS: TCol[] = [
  { k: "position", label: "ตำแหน่ง", fr: 1.1 },
  { k: "dept", label: "ฝ่าย", fr: 1 },
  { k: "role", label: "Key Role (บทบาทหลัก)", fr: 1.4 },
  { k: "resp", label: "Key Responsibilities", fr: 2.6 },
  { k: "output", label: "ผลลัพธ์ที่คาดหวัง", fr: 1.5 },
];

const KPI_COLS: TCol[] = [
  { k: "code", label: "รหัส", fr: 0.6, center: true },
  { k: "dept", label: "ฝ่าย", fr: 1.2 },
  { k: "kpi", label: "KPI", fr: 2 },
  { k: "formula", label: "นิยาม / สูตร", fr: 2.4 },
  { k: "unit", label: "หน่วย", fr: 0.7, center: true },
  { k: "a", label: "A", fr: 0.8, center: true },
  { k: "b", label: "B (Target)", fr: 0.9, center: true },
  { k: "c", label: "C", fr: 0.8, center: true },
  { k: "d", label: "D", fr: 0.8, center: true },
  { k: "weight", label: "น้ำหนัก %", fr: 0.7, center: true },
  { k: "freq", label: "ความถี่", fr: 0.9, center: true },
  { k: "owner", label: "ผู้เก็บข้อมูล", fr: 1.2 },
];

const GROUP_TITLE: Record<string, string> = {
  "Core Competency": "Core Competency · สมรรถนะหลัก",
  "Managerial Competency": "Managerial Competency · สมรรถนะบริหาร",
  "Functional Competency": "Functional Competency · สมรรถนะตามสายงาน",
};

function CompetencyCard({ entry }: { entry: DictEntry }) {
  const scale = (entry as DictEntry & { scale?: string }).scale ?? "รายละเอียดของความสามารถ 5 ระดับ เรียงจากน้อยไปมาก";
  const box: CSSProperties = { border: `1px solid ${LINE}`, borderTop: 0, display: "grid", gridTemplateColumns: "150px 1fr", fontSize: 12, lineHeight: 1.6 };
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ ...box, borderTop: `1px solid ${LINE}` }}>
        <div style={{ ...cellBase, background: SOFT, color: GRAY, borderRight: `1px solid ${LINE}` }}>{entry.code || `ตาราง ${entry.table}`}</div>
        <div style={{ ...cellBase, fontWeight: 700, color: NAVY, fontSize: 13.5 }}>{entry.name}</div>
      </div>
      <div style={box}>
        <div style={{ ...cellBase, background: SOFT, color: GRAY, borderRight: `1px solid ${LINE}` }}>ความหมาย (Definition)</div>
        <div style={cellBase}>{entry.def}</div>
      </div>
      <div style={{ ...cellBase, textAlign: "center", fontWeight: 700, fontSize: 12, background: "#E3E5EE", border: `1px solid ${LINE}`, borderTop: 0 }}>{scale}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", border: `1px solid ${LINE}`, borderTop: 0, fontSize: 11.5 }}>
        {entry.levels.map((l, i) => (
          <div key={l.n} style={{ borderRight: i < 4 ? `1px solid ${LINE}` : 0 }}>
            <div style={{ ...cellBase, background: YELLOW_SOFT, borderBottom: `1px solid ${LINE}`, color: NAVY }}>
              <b>ระดับ {l.n}: {l.label}</b> {l.desc}
            </div>
            <div style={cellBase}>{l.beh.map((b) => `– ${b}`).join("\n")}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: GRAY, lineHeight: 1.7, marginTop: 3 }}>ที่มา: {competencySource(entry)}</div>
    </div>
  );
}

function CustomCompetency({ row }: { row: Row }) {
  return (
    <div style={{ marginBottom: 6, border: `1px solid ${LINE}`, fontSize: 12 }}>
      <div style={{ ...cellBase, fontWeight: 700, color: NAVY, fontSize: 13.5 }}>{row.name} {row.level ? `(ระดับที่คาดหวัง ${row.level})` : ""}</div>
      {row.definition && <div style={cellBase}>{row.definition}</div>}
      {row.indicators && <div style={{ ...cellBase, borderTop: `1px solid ${LINE}` }}>{row.indicators}</div>}
    </div>
  );
}

async function buildBlocks(kind: SectionPdfKind, item: ExportItem, total: number): Promise<{ blocks: Blk[]; head: ReactNode | null; o: Orient; title: string }> {
  const rows = asRows(item.data.rows);
  const out: Blk[] = [{ id: "header", node: <Header item={item} total={total} />, keepNext: true }];
  const title = item.section.th;

  if (kind === "roles" || kind === "kpis") {
    const cols = kind === "roles" ? ROLE_COLS : KPI_COLS;
    const list = (kind === "roles" ? rows.filter((r) => cols.some((c) => (r[c.k] ?? "").trim())) : kpiRows(rows)) as Row[];
    if (!list.length) throw new Error("empty");
    const head = <THead cols={cols} />;
    out.push({ id: "thead", node: head, keepNext: true, table: true });
    const size = kind === "roles" ? 12 : 11;
    list.forEach((r, i) => out.push({ id: `r${i}`, node: <TRow cols={cols} row={r} size={size} />, table: true }));
    return { blocks: out, head, o: kind === "roles" ? "p" : "l", title };
  }

  const dict = (await import("@/lib/data/competency-dict.json")).default as unknown as DictEntry[];
  const chosen = rows.filter((r) => (r.name ?? "").trim());
  if (!chosen.length) throw new Error("empty");
  const entries: DictEntry[] = [];
  const custom: Row[] = [];
  chosen.forEach((r) => {
    const e = dict.find((d) => competencySource(d) === (r.source ?? "").trim()) ?? dict.find((d) => d.name === (r.name ?? "").trim());
    if (!e) custom.push(r);
    else if (!entries.includes(e)) entries.push(e);
  });
  let lastType = "";
  entries.forEach((e) => {
    if (e.type !== lastType) {
      lastType = e.type;
      out.push({
        id: `g:${e.type}`,
        keepNext: true,
        node: <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: "6px 0 8px", lineHeight: 1.5 }}>{GROUP_TITLE[e.type] ?? e.type}</div>,
      });
    }
    out.push({ id: `c:${e.id}`, node: <CompetencyCard entry={e} /> });
  });
  if (custom.length) {
    out.push({ id: "g:custom", keepNext: true, node: <div style={{ fontSize: 17, fontWeight: 700, color: NAVY, margin: "6px 0 8px" }}>สมรรถนะที่เพิ่มเอง</div> });
    custom.forEach((r, i) => out.push({ id: `x${i}`, node: <CustomCompetency row={r} /> }));
  }
  return { blocks: out, head: null, o: "l", title };
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));

export async function buildSectionPdf(
  kind: SectionPdfKind,
  item: ExportItem,
  company: string,
  total: number,
  onProgress: PdfProgress,
): Promise<Blob> {
  const fonts = await loadFonts(["400", "600", "700"]);
  const { blocks, head, o, title } = await buildBlocks(kind, item, total);
  const { w, h } = DIM[o];
  const innerW = w - PX * 2;
  const limit = h - TOP - FOOT - 10;

  const mkHost = (width: number) => {
    const el = document.createElement("div");
    el.style.cssText = `position:fixed;left:-100000px;top:0;width:${width}px;font-family:${fonts.th};color:${INK};-webkit-font-smoothing:antialiased;pointer-events:none;`;
    document.body.appendChild(el);
    return el;
  };

  // 1) วัดความสูงแต่ละบล็อก
  onProgress(0, 1, "กำลังจัดหน้า…");
  const H = new Map<string, number>();
  {
    const host = mkHost(innerW);
    const r = createRoot(host);
    r.render(
      <>
        {blocks.map((b) => (
          <div key={b.id} data-bid={b.id}>{b.node}</div>
        ))}
        {head && <div data-bid="__head">{head}</div>}
      </>,
    );
    await nextFrame();
    try {
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ที่มีอยู่ */
    }
    await nextFrame();
    host.querySelectorAll<HTMLElement>("[data-bid]").forEach((el) => H.set(el.dataset.bid as string, Math.ceil(el.getBoundingClientRect().height)));
    r.unmount();
    host.remove();
  }

  // 2) จัดหน้า (แถวตารางไม่ถูกตัดกลางแถว ส่วนหัวตารางพิมพ์ซ้ำทุกหน้า)
  const pages: Blk[][] = [];
  let cur: Blk[] = [];
  let used = 0;
  blocks.forEach((b, i) => {
    const bh = H.get(b.id) ?? 0;
    const nextH = b.keepNext && blocks[i + 1] ? (H.get(blocks[i + 1].id) ?? 0) : 0;
    if (cur.length && used + bh + nextH > limit) {
      pages.push(cur);
      cur = [];
      used = 0;
      if (b.table && head && b.id !== "thead") {
        cur.push({ id: `__head${pages.length}`, node: head, table: true });
        used += H.get("__head") ?? 0;
      }
    }
    cur.push(b);
    used += bh;
  });
  if (cur.length) pages.push(cur);

  // 3) วาดแต่ละหน้าเป็นภาพ แล้วรวมเป็น PDF
  const host = mkHost(w);
  const root = createRoot(host);
  const left = `${company.trim() || "รายงานแผนธุรกิจ"} · แผนธุรกิจ · ${title}`;
  root.render(
    <>
      {pages.map((p, pi) => (
        <div key={pi} data-page={pi} style={{ position: "relative", width: w, height: h, background: "#fff", overflow: "hidden", marginBottom: 8 }}>
          <div style={{ position: "absolute", left: PX, right: PX, top: TOP }}>
            {p.map((b) => (
              <div key={b.id}>{b.node}</div>
            ))}
          </div>
          <div
            style={{
              position: "absolute",
              left: PX,
              right: PX,
              bottom: 0,
              height: FOOT,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px solid ${LINE}`,
              fontSize: 11.5,
              color: GRAY,
            }}
          >
            <span style={{ maxWidth: "75%", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", lineHeight: 1.7 }}>{left}</span>
            <span>หน้า {pi + 1} / {pages.length}</span>
          </div>
        </div>
      ))}
    </>,
  );
  await nextFrame();
  try {
    await document.fonts.ready;
  } catch {
    /* ใช้ฟอนต์ที่มีอยู่ */
  }
  await nextFrame();

  const { toJpeg } = await import("html-to-image");
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: o === "l" ? "landscape" : "portrait", compress: true });
  pdf.setProperties({ title: `${title} ${company}`.trim(), author: "Anna AI", creator: "Anna AI" });
  const els = [...host.querySelectorAll<HTMLElement>("[data-page]")];
  const opts = { pixelRatio: 2, quality: 0.92, backgroundColor: "#ffffff", width: w, height: h };
  await toJpeg(els[0], opts).catch(() => null);
  try {
    for (let i = 0; i < els.length; i++) {
      onProgress(i, els.length, `กำลังสร้างหน้า ${i + 1} / ${els.length}`);
      const url = await toJpeg(els[i], opts);
      if (i > 0) pdf.addPage("a4", o === "l" ? "landscape" : "portrait");
      pdf.addImage(url, "JPEG", 0, 0, o === "l" ? 297 : 210, o === "l" ? 210 : 297, undefined, "FAST");
    }
    onProgress(els.length, els.length, "กำลังบันทึกไฟล์…");
    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}
