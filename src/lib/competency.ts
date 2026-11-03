import type { Row } from "@/lib/form-logic";

export type DictLevel = { n: number; label: string; desc: string; beh: string[] };
export type DictEntry = {
  id: string;
  type: string;
  gth: string;
  file: string;
  table: number;
  code: string;
  name: string;
  def: string;
  levels: DictLevel[];
};

export const competencySource = (c: DictEntry) => `${c.file} · ${c.code || "ตาราง " + c.table}`;

/** แถวในตารางสมรรถนะ คัดลอกจากพจนานุกรมตรงตัว ตามระดับที่เลือก (1–5) */
export function competencyRow(c: DictEntry, level: number): Row {
  const L = c.levels[level - 1];
  return {
    name: c.name,
    type: c.type,
    definition: c.def,
    positions: "",
    level: L ? String(level) : "",
    indicators: L ? L.beh.map((b) => "- " + b).join("\n") : "",
    source: competencySource(c),
  };
}
