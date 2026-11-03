import type { Row } from "@/lib/form-logic";

/* พอร์ตตรรกะ KPI จากต้นฉบับ: ช่วงเกณฑ์ A–D, น้ำหนักรายฝ่าย, เกรดรายตัวและรายฝ่าย */

type Range = { lo: number; li: boolean; hi: number; hi_: boolean };
type Parsed = Range | "num" | "bad" | null;

export const GR = ["a", "b", "c", "d"] as const;

const str = (v: unknown) => (v == null ? "" : String(v));
export const numv = (v: unknown): number | null => {
  const n = parseFloat(str(v).replace(/[,%\s]/g, ""));
  return Number.isNaN(n) ? null : n;
};
export const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** '> 11', '[10 – 11]', '[7 – 10)', '< 7' → ช่วง ([ ] นับตัวเลขนั้น, ( ) ไม่นับ) */
export function parseRange(s: unknown): Parsed {
  let t = str(s).trim();
  if (!t) return null;
  t = t
    .replace(/มากกว่าหรือเท่ากับ|ไม่น้อยกว่า|≥/g, ">=")
    .replace(/น้อยกว่าหรือเท่ากับ|ไม่เกิน|≤/g, "<=")
    .replace(/มากกว่า|สูงกว่า|เกิน/g, ">")
    .replace(/น้อยกว่า|ต่ำกว่า/g, "<")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/\s+/g, "")
    .replace(/^=(?=[<>])/, "")
    .replace(/^=>/, ">=")
    .replace(/^=</, "<=");
  const N = "(-?\\d+(?:\\.\\d+)?)";
  let m = t.match(new RegExp("^(>=|>|<=|<)" + N));
  if (m) {
    const v = +m[2];
    return m[1][0] === ">"
      ? { lo: v, li: m[1] === ">=", hi: Infinity, hi_: false }
      : { lo: -Infinity, li: false, hi: v, hi_: m[1] === "<=" };
  }
  m = t.match(new RegExp("^([\\[(])" + N + "(?:-|–|—|~|ถึง)" + N + "([\\])])"));
  if (m) {
    let lo = +m[2];
    let hi = +m[3];
    let li = m[1] === "[";
    let hi_ = m[4] === "]";
    if (lo > hi) [lo, hi, li, hi_] = [hi, lo, hi_, li];
    return { lo, li, hi, hi_ };
  }
  return /^-?\d+(\.\d+)?/.test(t) && !/[[\]()<>]/.test(t) ? "num" : "bad";
}

const inRange = (v: number, R: Range) =>
  (v > R.lo || (R.li && v === R.lo)) && (v < R.hi || (R.hi_ && v === R.hi));

export type Rule =
  | { mode: "num"; issues: string[] }
  | { mode: "range"; ranges: (Range | null)[]; issues: string[] };

/** วิธีให้เกรดของแถว พร้อมสิ่งที่ผู้ใช้ต้องแก้ */
export function kpiRule(r: Row): Rule {
  const P = GR.map((k) => parseRange(r[k]));
  const L = (k: string) => k.toUpperCase();
  const issues: string[] = [];
  if (!P.some((x) => x && typeof x === "object")) {
    // แถวแบบเก่า: ตัวเลขเดียวต่อเกรด
    if (P.some((x) => x === "bad")) {
      issues.push("ช่อง " + GR.filter((_, i) => P[i] === "bad").map(L).join(", ") + " รูปแบบไม่ถูกต้อง");
    }
    return { mode: "num", issues };
  }
  const badK = GR.filter((_, i) => P[i] === "num" || P[i] === "bad").map(L);
  if (badK.length) issues.push(`ช่อง ${badK.join(", ")} ไม่ใช่ช่วง ใช้ > x, < x, [x – y] หรือ [x – y)`);
  const R = GR.map((k, i) => ({ g: L(k), r: typeof P[i] === "object" ? (P[i] as Range) : null }))
    .filter((x): x is { g: string; r: Range } => !!x.r)
    .sort((x, y) => x.r.lo - y.r.lo || (x.r.li === y.r.li ? 0 : x.r.li ? -1 : 1));
  if (!badK.length) {
    for (let i = 1; i < R.length; i++) {
      const p = R[i - 1].r;
      const n = R[i].r;
      const pair = [R[i - 1].g, R[i].g].sort().join(" กับ ");
      if (p.hi > n.lo || (p.hi === n.lo && p.hi_ && n.li)) issues.push(`ช่วง ${pair} ซ้อนกัน`);
      else if (p.hi < n.lo || (p.hi === n.lo && !p.hi_ && !n.li)) issues.push(`ช่วง ${pair} ไม่ต่อกัน (มีช่องว่าง)`);
    }
  }
  return { mode: "range", ranges: P.map((x) => (typeof x === "object" ? x : null)), issues };
}

export function gradeOf(r: Row, actual: unknown): "" | "A" | "B" | "C" | "D" {
  const v = numv(actual);
  if (v === null) return "";
  const rule = kpiRule(r);
  if (rule.mode === "range") {
    const i = rule.ranges.findIndex((R) => R && inRange(v, R));
    return i < 0 ? "" : (("ABCD"[i] ?? "") as "A" | "B" | "C" | "D");
  }
  const a = numv(r.a);
  const b = numv(r.b);
  const c = numv(r.c);
  if (a === null || b === null || c === null) return "";
  // ทิศทางมาจากเกณฑ์: A สูงกว่า C = ยิ่งสูงยิ่งดี, A ต่ำกว่า C = ยิ่งต่ำยิ่งดี
  const hi = a !== c ? a > c : r.dir !== "L";
  if (hi) return v >= a ? "A" : v >= b ? "B" : v >= c ? "C" : "D";
  return v <= a ? "A" : v <= b ? "B" : v <= c ? "C" : "D";
}

export function gradeNote(r: Row, actual: unknown): string {
  const v = numv(actual);
  if (v === null) return "";
  const rule = kpiRule(r);
  if (rule.mode === "range" && !rule.ranges.some((R) => R && inRange(v, R))) return "ผลจริงไม่อยู่ในช่วงใด";
  return "";
}

export const actKey = (r: Row) => `${(r.code ?? "").trim()}|${(r.kpi ?? "").trim()}`;
export const kpiRows = (rows: Row[]) => rows.filter((r) => (r.kpi ?? "").trim() || (r.code ?? "").trim());

export function weightGroups(rows: Row[]): { dept: string; sum: number }[] {
  const g = new Map<string, number>();
  rows.forEach((r) => {
    if (!Object.values(r).some((v) => String(v).trim())) return;
    const d = (r.dept ?? "").trim() || "ไม่ระบุฝ่าย";
    g.set(d, (g.get(d) ?? 0) + (parseFloat(r.weight) || 0));
  });
  return [...g].map(([dept, sum]) => ({ dept, sum }));
}

const G_SCORE = { A: 4, B: 3, C: 2, D: 1 } as const;

export type DeptGrade = {
  dept: string;
  n: number;
  tot: number;
  avg: number | null;
  grade: "" | "A" | "B" | "C" | "D";
};

export function deptGrades(rows: Row[], act: Record<string, string>): DeptGrade[] {
  const m = new Map<string, { sc: number; w: number; n: number; tot: number }>();
  kpiRows(rows).forEach((r) => {
    const g = gradeOf(r, act[actKey(r)]);
    const w = numv(r.weight) ?? 0;
    const d = (r.dept ?? "").trim() || "ไม่ระบุฝ่าย";
    const x = m.get(d) ?? { sc: 0, w: 0, n: 0, tot: 0 };
    x.tot++;
    if (g && w > 0) {
      x.sc += G_SCORE[g] * w;
      x.w += w;
      x.n++;
    }
    m.set(d, x);
  });
  return [...m].map(([dept, x]) => {
    const avg = x.w ? x.sc / x.w : null;
    const grade = avg === null ? "" : avg >= 3.5 ? "A" : avg >= 2.5 ? "B" : avg >= 1.5 ? "C" : "D";
    return { dept, n: x.n, tot: x.tot, avg, grade } as DeptGrade;
  });
}
