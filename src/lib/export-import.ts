import type { Row } from "@/lib/form-logic";
import { asRows } from "@/lib/form-logic";
import type { DictEntry } from "@/lib/competency";
import { competencySource } from "@/lib/competency";
import { kpiRows, numv } from "@/lib/kpi";

/* ไฟล์ Excel สำหรับนำเข้าระบบประเมิน: โครงคอลัมน์ตรงตัวอย่าง "Output AI-ANNA"
   (แถวที่ 1 เว้นว่าง ส่วนหัวตารางอยู่แถวที่ 2 ในไฟล์ Key Role และ KPI) */

type Wb = import("exceljs").Workbook;
type Ws = import("exceljs").Worksheet;

const FONT = "Tahoma";
const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"];

async function newWorkbook(): Promise<Wb> {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = "Anna AI";
  wb.created = new Date();
  return wb;
}

const toBlob = async (wb: Wb) =>
  new Blob([await wb.xlsx.writeBuffer()], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

const sheetName = (s: string, taken: Set<string>) => {
  const base = (s.replace(/[\\/?*[\]:]/g, "-").slice(0, 28).trim() || "Sheet");
  let name = base;
  for (let i = 2; taken.has(name.toLowerCase()); i++) name = `${base.slice(0, 26)} ${i}`;
  taken.add(name.toLowerCase());
  return name;
};

function headerRow(ws: Ws, rowNo: number, headers: string[]) {
  const row = ws.getRow(rowNo);
  headers.forEach((h, i) => {
    const c = row.getCell(i + 1);
    c.value = h;
    c.font = { name: FONT, bold: true };
    c.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });
}

const bullets = (s: string) =>
  s
    .split(/\r?\n/)
    .map((x) => x.replace(/^\s*(?:[-–•·*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

/** 1.2 Input Key Role: หนึ่งตำแหน่งต่อหนึ่งชีต, Key Role ข้อ 1, 2… และข้อย่อย 1.1, 1.2… จาก Key Responsibilities */
export async function buildKeyRoleXlsx(rows: Row[]): Promise<Blob> {
  const wb = await newWorkbook();
  const groups = new Map<string, Row[]>();
  asRows(rows)
    .filter((r) => ["position", "role", "resp"].some((k) => (r[k] ?? "").trim()))
    .forEach((r) => {
      const key = (r.position ?? "").trim() || "ไม่ระบุตำแหน่ง";
      groups.set(key, [...(groups.get(key) ?? []), r]);
    });
  const taken = new Set<string>();
  let gi = 0;
  groups.forEach((list, position) => {
    const ws = wb.addWorksheet(sheetName(position, taken));
    ws.columns = [{ width: 23 }, { width: 5.4 }, { width: 29.6 }, { width: 8 }, { width: 41.4 }, { width: 50 }];
    headerRow(ws, 2, ["Job Group", "ข้อที่", "Key Roles", "ข้อย่อย", "Area of Responsibility", position]);
    const group = `${ROMAN[gi] ?? gi + 1}. ${position}`;
    gi++;
    let at = 3;
    list.forEach((r, ri) => {
      const n = ri + 1;
      ws.getCell(at, 1).value = group;
      ws.getCell(at, 2).value = n;
      ws.getCell(at, 3).value = (r.role ?? "").trim();
      at++;
      bullets(r.resp ?? "").forEach((b, bi) => {
        ws.getCell(at, 1).value = group;
        ws.getCell(at, 4).value = `${n}.${bi + 1}`;
        ws.getCell(at, 5).value = b;
        at++;
      });
    });
    if (at - 1 > 3) ws.mergeCells(3, 1, at - 1, 1);
    for (let r = 3; r < at; r++) {
      ws.getRow(r).eachCell({ includeEmpty: true }, (c) => {
        c.font = { name: FONT };
        c.alignment = { vertical: "top", wrapText: true };
      });
    }
  });
  if (!groups.size) wb.addWorksheet("Key Role");
  return toBlob(wb);
}

/** 2.2 Input KPI: หนึ่งไฟล์ต่อผู้บริหาร/ฝ่าย (ตามช่อง "ฝ่าย") ชีต kpi_csr_indiv */
export async function buildKpiFiles(rows: Row[]): Promise<{ name: string; blob: Blob }[]> {
  const groups = new Map<string, Row[]>();
  kpiRows(asRows(rows)).forEach((r) => {
    const key = (r.dept ?? "").trim() || "ไม่ระบุฝ่าย";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  });
  const out: { name: string; blob: Blob }[] = [];
  const names = new Set<string>();
  for (const [dept, list] of groups) {
    const wb = await newWorkbook();
    const ws = wb.addWorksheet("kpi_csr_indiv");
    ws.columns = [5, 40, 45, 14.5, 22, 8.7, 13.3, 13.3, 13.3, 13.3, 13.3, 8.7].map((width) => ({ width }));
    headerRow(ws, 2, ["ข้อที่", "KPI Name", "Definition", "Frequency", "Data Collector", "Unit", "Target Number", "A", "B", "C", "D", "Remark"]);
    list.forEach((r, i) => {
      const w = numv(r.weight);
      const values = [
        (r.code ?? "").trim() || i + 1,
        (r.kpi ?? "").trim(),
        (r.formula ?? "").trim(),
        (r.freq ?? "").trim(),
        (r.owner ?? "").trim(),
        (r.unit ?? "").trim(),
        (r.b ?? "").trim(),
        (r.a ?? "").trim(),
        (r.b ?? "").trim(),
        (r.c ?? "").trim(),
        (r.d ?? "").trim(),
        w == null ? null : Math.round(w * 100) / 10000,
      ];
      const row = ws.getRow(3 + i);
      values.forEach((v, ci) => {
        const c = row.getCell(ci + 1);
        c.value = v === "" ? null : v;
        c.font = { name: FONT };
        c.alignment = { vertical: "top", wrapText: true };
      });
    });
    let file = `2.2 Input KPI - ${dept.replace(/[\\/:*?"<>|]+/g, "-").trim()}`;
    for (let k = 2; names.has(file.toLowerCase()); k++) file = `${file} (${k})`;
    names.add(file.toLowerCase());
    out.push({ name: `${file}.xlsx`, blob: await toBlob(wb) });
  }
  return out;
}

const GROUP: Record<string, string> = {
  "Core Competency": "CC",
  "Managerial Competency": "MC",
  "Functional Competency": "FC",
};

const COMPETENCY_HEADERS = [
  "ข้อที่",
  "คำถาม",
  "คำอธิบายเกี่ยวกับคำถาม (Tooltip)",
  "Competency Dictionary Name",
  "ระดับความสามารถ",
  "คำถามข้อที่ (1-xx)",
  "ประเภทของการวัด (1.พฤติกรรม/2.ทำงาน)",
  "คำอธิบายตัวเลือก(1)",
  "คำอธิบายตัวเลือก(2)",
  "คำอธิบายตัวเลือก(3)",
  "คำอธิบายตัวเลือก(4)",
  "คำอธิบายตัวเลือก(5)",
  "Code",
  "คำถาม(อังกฤษ)",
  "คำอธิบายเกี่ยวกับคำถาม (Tooltip)(อังกฤษ)",
  "คำอธิบายตัวเลือก(1)(อังกฤษ)",
  "คำอธิบายตัวเลือก(2)(อังกฤษ)",
  "คำอธิบายตัวเลือก(3)(อังกฤษ)",
  "คำอธิบายตัวเลือก(4)(อังกฤษ)",
  "คำอธิบายตัวเลือก(5)(อังกฤษ)",
  "Dictionary Name(EN)",
  "Group",
];

/** 3.2 Input Competency: หนึ่งพฤติกรรมบ่งชี้ = หนึ่งคำถาม ครบทุกระดับของสมรรถนะที่เลือกไว้ */
export async function buildCompetencyXlsx(rows: Row[]): Promise<Blob> {
  const dict = (await import("@/lib/data/competency-dict.json")).default as unknown as DictEntry[];
  const counters: Record<string, number> = {};
  const codeOf = new Map<string, string>();
  dict.forEach((d) => {
    const g = GROUP[d.type] ?? "FC";
    counters[g] = (counters[g] ?? 0) + 1;
    codeOf.set(d.id, `${g}${counters[g]}`);
  });

  const wb = await newWorkbook();
  const ws = wb.addWorksheet("competency_template_question");
  ws.columns = [8.2, 49.5, 38.4, 47.6, 16, 16.4, 20.9, 23.5, ...Array(14).fill(18)].map((width) => ({ width }));
  headerRow(ws, 1, COMPETENCY_HEADERS);
  ws.getRow(1).height = 45;

  let no = 0;
  const put = (q: string, tip: string, name: string, level: number, qn: number, code: string, group: string) => {
    no++;
    const vals: (string | number)[] = [no, q, tip, name, level, qn, "", "", "", "", "", "", code, "", "", "", "", "", "", "", "", group];
    const row = ws.getRow(1 + no);
    vals.forEach((v, i) => {
      const c = row.getCell(i + 1);
      c.value = v === "" ? null : v;
      c.font = { name: FONT };
      c.alignment = { vertical: "top", wrapText: true };
    });
  };

  asRows(rows)
    .filter((r) => (r.name ?? "").trim())
    .forEach((r) => {
      const entry = dict.find((d) => competencySource(d) === (r.source ?? "").trim()) ?? dict.find((d) => d.name === (r.name ?? "").trim());
      if (entry) {
        const code = codeOf.get(entry.id) ?? "";
        const group = GROUP[entry.type] ?? "FC";
        entry.levels.forEach((l) => l.beh.forEach((b, bi) => put(b, entry.def, entry.name, l.n, bi + 1, code, group)));
      } else {
        // สมรรถนะที่พิมพ์เอง: ใช้ระดับและพฤติกรรมบ่งชี้ตามที่กรอก
        const level = Number(r.level) || 1;
        bullets(r.indicators ?? "").forEach((b, bi) => put(b, (r.definition ?? "").trim(), (r.name ?? "").trim(), level, bi + 1, "", ""));
      }
    });
  ws.views = [{ state: "frozen", ySplit: 1 }];
  return toBlob(wb);
}

/** ชุดไฟล์ทั้งหมดในโฟลเดอร์เดียว (zip) ตามโครงของตัวอย่าง */
export async function buildImportZip(parts: { roles: Row[]; kpis: Row[]; competency: Row[] }): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const dir = zip.folder("Output AI-ANNA")!;
  dir.file("1.2 Input Key Role.xlsx", await buildKeyRoleXlsx(parts.roles));
  for (const f of await buildKpiFiles(parts.kpis)) dir.file(f.name, f.blob);
  dir.file("3.2 Input Competency.xlsx", await buildCompetencyXlsx(parts.competency));
  return zip.generateAsync({ type: "blob" });
}
