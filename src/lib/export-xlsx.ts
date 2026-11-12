import type { Field, Section } from "@/lib/form-schema";
import { asList, asRows, asText, hasVal, type Row, type SectionData } from "@/lib/form-logic";
import { actKey, gradeOf, kpiRows } from "@/lib/kpi";
import { STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";

export type ExportItem = { section: Section; data: SectionData; status: SectionStatus };
export type ExportImages = { fishbone?: string | null; bmc?: string | null; org?: string | null };

type Cell = string | number | null;

const NAVY = "FF1C244B";
const FONT = "Tahoma";

/** ชื่อชีตของ Excel: ไม่เกิน 31 ตัว และห้ามมี \ / ? * [ ] : */
const sheetName = (s: string) => s.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim();

const numOrText = (type: string | undefined, v: string): Cell => {
  const t = v.trim();
  if (!t) return null;
  if (type === "number") {
    const n = Number(t.replace(/,/g, ""));
    return Number.isNaN(n) ? t : n;
  }
  return t;
};

type Block = { headers: string[]; widths: number[]; rows: Cell[][] };

/** ตารางแนวราบ (หนึ่งแถว = หนึ่งรายการ) เหมาะนำไปกรอง/สรุป/นำเข้าระบบอื่น */
function flatTable(section: Section, field: Field, data: SectionData): Block {
  const cols = field.cols ?? [];
  const rows = asRows(data[field.k]).filter((r) => cols.some((c) => (r[c.k] ?? "").trim()));
  const headers = ["ข้อที่", ...cols.map((c) => c.label)];
  const widths = [8, ...cols.map((c) => Math.max(12, Math.min(60, Math.round((c.w ?? 140) / 6))))];
  const out = rows.map((r, i): Cell[] => [i + 1, ...cols.map((c) => numOrText(c.type, r[c.k] ?? ""))]);

  if (section.id === "kpis") {
    const act = data._act ?? {};
    const isKpi = new Set(kpiRows(rows));
    headers.push("ผลจริง", "เกรด");
    widths.push(14, 8);
    rows.forEach((r, i) => {
      const v = isKpi.has(r) ? (act[actKey(r)] ?? "").trim() : "";
      out[i].push(v || null, v ? gradeOf(r, v) || null : null);
    });
  }
  return { headers, widths, rows: out };
}

/** รูปแบบยาว: หัวข้อ | ลำดับ | ข้อมูล สำหรับหัวข้อที่เป็นช่องกรอกทีละข้อและรายการ */
function longTable(section: Section, data: SectionData): Block {
  const rows: Cell[][] = [];
  section.fields.forEach((f: Field) => {
    if (f.type === "cmpEdits" || f.type === "table") return;
    const v = data[f.k];
    if (!hasVal(f, v)) return;
    if (f.type === "list") {
      asList(v)
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((x, i) => rows.push([f.label, i + 1, x]));
    } else {
      rows.push([f.label, null, numOrText(f.type, asText(v))]);
    }
  });
  return { headers: ["หัวข้อ", "ลำดับ", "ข้อมูล"], widths: [34, 8, 90], rows };
}

/** สาเหตุของก้างปลา: หมวด | ลำดับ | หัวข้อสาเหตุ | รายละเอียด */
function fishboneCauses(data: SectionData): Block {
  const rows: Cell[][] = [];
  asRows(data.cats).forEach((c: Row) => {
    (c.causes ?? "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .forEach((x, i) => {
        const at = x.search(/[:：]/);
        const head = at > 0 ? x.slice(0, at).trim() : x;
        const detail = at > 0 ? x.slice(at + 1).trim() : "";
        rows.push([(c.name ?? "").trim(), i + 1, head, detail || null]);
      });
  });
  return { headers: ["หมวด", "ลำดับ", "หัวข้อสาเหตุ", "รายละเอียด"], widths: [30, 8, 55, 70], rows };
}

export async function buildXlsx(
  items: ExportItem[],
  company: string,
  dateText: string,
  images: ExportImages,
): Promise<Blob> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Anna AI";
  wb.created = new Date();

  const thin = { style: "thin", color: { argb: "FFD0D4E0" } } as const;
  const border = { top: thin, left: thin, bottom: thin, right: thin };

  const writeBlock = (ws: import("exceljs").Worksheet, b: Block, startRow = 1) => {
    ws.columns = b.widths.map((w) => ({ width: w }));
    const head = ws.getRow(startRow);
    b.headers.forEach((h, i) => {
      const c = head.getCell(i + 1);
      c.value = h;
      c.font = { name: FONT, bold: true, color: { argb: "FFFFFFFF" } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
      c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      c.border = border;
    });
    head.height = 26;
    b.rows.forEach((r, ri) => {
      const row = ws.getRow(startRow + 1 + ri);
      r.forEach((v, ci) => {
        const c = row.getCell(ci + 1);
        c.value = v;
        c.font = { name: FONT };
        c.alignment = { vertical: "top", wrapText: true, horizontal: typeof v === "number" ? "center" : "left" };
        c.border = border;
      });
    });
    ws.views = [{ state: "frozen", ySplit: startRow }];
    if (b.rows.length) {
      ws.autoFilter = { from: { row: startRow, column: 1 }, to: { row: startRow + b.rows.length, column: b.headers.length } };
    }
  };

  // ชีตสรุป
  const sum = wb.addWorksheet("สรุป");
  sum.getCell("A1").value = "Anna AI · แผนธุรกิจและแผนบุคลากร";
  sum.getCell("A1").font = { name: FONT, bold: true, size: 16, color: { argb: NAVY } };
  sum.getCell("A2").value = `บริษัท: ${company || "(ยังไม่ระบุชื่อ)"}`;
  sum.getCell("A3").value = `จัดทำเมื่อ ${dateText}`;
  ["A2", "A3"].forEach((a) => (sum.getCell(a).font = { name: FONT }));
  const sumBlock: Block = {
    headers: ["หัวข้อที่", "หัวข้อ", "English", "สถานะ", "ชีต"],
    widths: [10, 38, 34, 16, 32],
    rows: items.map((i) => [
      i.section.no,
      i.section.th,
      i.section.en,
      STATUS_TEXT[i.status],
      sheetName(`${String(i.section.no).padStart(2, "0")} ${i.section.th}`),
    ]),
  };
  writeBlock(sum, sumBlock, 5);
  sum.views = [];
  sum.getColumn(1).width = 10;

  items.forEach(({ section, data }) => {
    const base = sheetName(`${String(section.no).padStart(2, "0")} ${section.th}`);
    const tables = section.fields.filter((f) => f.type === "table");
    const others = section.fields.filter((f) => f.type !== "table" && f.type !== "cmpEdits");

    if (section.id === "fishbone") {
      writeBlock(wb.addWorksheet(base), longTable(section, data));
      writeBlock(wb.addWorksheet(sheetName(`${base} สาเหตุ`)), fishboneCauses(data));
      return;
    }
    if (tables.length === 1 && others.length === 0) {
      writeBlock(wb.addWorksheet(base), flatTable(section, tables[0], data));
      return;
    }
    writeBlock(wb.addWorksheet(base), longTable(section, data));
    tables.forEach((t, i) => writeBlock(wb.addWorksheet(sheetName(`${base} ${i + 2}`)), flatTable(section, t, data)));
  });

  // ภาพประกอบ
  const pics: [string, string | null | undefined, number, number][] = [
    ["แผนผังก้างปลา", images.fishbone, 1100, 0],
    ["Business Model Canvas", images.bmc, 1200, 0],
    ["โครงสร้างองค์กร", images.org, 1100, 0],
  ];
  const have = pics.filter((p) => p[1]);
  if (have.length) {
    const ws = wb.addWorksheet("ภาพประกอบ");
    let row = 1;
    for (const [title, url, width] of have) {
      ws.getCell(row, 1).value = title;
      ws.getCell(row, 1).font = { name: FONT, bold: true, size: 14, color: { argb: NAVY } };
      const dims = await imageSize(url as string);
      const w = Math.min(width, dims.w);
      const h = Math.round((dims.h * w) / dims.w);
      const id = wb.addImage({ base64: url as string, extension: "png" });
      ws.addImage(id, { tl: { col: 0, row }, ext: { width: w, height: h } });
      row += Math.ceil(h / 20) + 3;
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

function imageSize(url: string): Promise<{ w: number; h: number }> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res({ w: img.naturalWidth || 1000, h: img.naturalHeight || 600 });
    img.onerror = () => res({ w: 1000, h: 600 });
    img.src = url;
  });
}
