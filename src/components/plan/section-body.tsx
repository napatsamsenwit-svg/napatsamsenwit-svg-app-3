"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Col, Field, Section } from "@/lib/form-schema";
import { asList, asRows, asText, type FieldValue, type Row, type SectionData } from "@/lib/form-logic";
import { cn } from "@/lib/utils";
import { CompetencyPicker } from "./competency-picker";
import { Control, ListField, MapField, TableField } from "./fields";
import { FishboneCats } from "./fishbone-cats";
import { KpiGrades, KpiImport, KpiWeights } from "./kpi-extras";

/** ตำแหน่งของแต่ละช่องบนผัง Business Model Canvas (เดสก์ท็อป) */
const BMC_AREA: Record<string, string> = {
  kp: "md:col-span-2 md:row-span-2",
  ka: "md:col-span-2",
  kr: "md:col-span-2",
  vp: "md:col-span-2 md:row-span-2",
  cr: "md:col-span-2",
  ch: "md:col-span-2",
  cs: "md:col-span-2 md:row-span-2",
  cost: "md:col-span-5",
  rev: "md:col-span-5",
};
/** ลำดับวางบนกริด 10 คอลัมน์: คอลัมน์ซ้าย → ขวา แล้วแถวล่าง */
const BMC_ORDER = ["kp", "ka", "vp", "cr", "cs", "kr", "ch", "cost", "rev"];

export type BodyProps = {
  section: Section;
  data: SectionData;
  onChange: (d: SectionData) => void;
  disabled: boolean;
  /** ปุ่มเสริมใต้ช่องในตาราง (เช่น ปุ่ม AI รายช่อง) */
  cellExtra?: (field: Field, col: Col, row: Row, rowIndex: number) => React.ReactNode;
  onMessage: (text: string) => void;
};

export function SectionBody({ section, data, onChange, disabled, cellExtra, onMessage }: BodyProps) {
  const set = (k: string, v: FieldValue) => onChange({ ...data, [k]: v });
  const pre = `f-${section.id}`;

  const renderField = (f: Field) => {
    const id = `${pre}-${f.k}`;
    if (f.type === "list") {
      return <ListField field={f} idPrefix={id} value={asList(data[f.k])} onChange={(v) => set(f.k, v)} />;
    }
    if (f.type === "table") {
      return (
        <div className="space-y-3">
          {f.label && <span className="block text-sm font-medium">{f.label}</span>}
          <TableField
            field={f}
            idPrefix={id}
            value={asRows(data[f.k])}
            onChange={(v) => set(f.k, v)}
            cellExtra={cellExtra ? (c, r, ri) => cellExtra(f, c, r, ri) : undefined}
          />
        </div>
      );
    }
    if (f.map) {
      return (
        <div className="space-y-1.5">
          <Label htmlFor={id}>{f.label}</Label>
          <MapField
            field={f}
            id={id}
            value={asText(data[f.k])}
            location={asText(data.location)}
            onChange={(v) => set(f.k, v)}
            onMessage={onMessage}
          />
        </div>
      );
    }
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>{f.label}</Label>
        <Control
          id={id}
          type={f.type === "cmpEdits" ? "text" : f.type}
          value={asText(data[f.k])}
          ph={f.ph}
          options={f.options}
          keep={f.keep}
          rows={f.rows}
          label={f.label}
          onChange={(v) => set(f.k, v)}
        />
      </div>
    );
  };

  const fields = section.fields.filter((f) => f.type !== "cmpEdits");

  let body: React.ReactNode;
  if (section.layout === "swot") {
    body = (
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => (
          <div key={f.k} className="rounded-xl border bg-card p-3 md:p-4">
            {renderField(f)}
          </div>
        ))}
      </div>
    );
  } else if (section.layout === "bmc") {
    const byKey = new Map(fields.map((f) => [f.k, f]));
    body = (
      <div className="grid gap-3 md:grid-cols-10">
        {BMC_ORDER.map((k) => {
          const f = byKey.get(k);
          if (!f) return null;
          const id = `${pre}-${f.k}`;
          return (
            <div key={k} className={cn("flex flex-col rounded-xl border bg-card p-3", BMC_AREA[k])}>
              <Label htmlFor={id} className="mb-1.5 text-sm font-medium">
                {f.label}
              </Label>
              <Textarea
                id={id}
                value={asText(data[f.k])}
                onChange={(e) => set(f.k, e.target.value)}
                placeholder="ขึ้นบรรทัดใหม่ด้วย - "
                className="min-h-28 flex-1 md:min-h-24"
              />
            </div>
          );
        })}
      </div>
    );
  } else if (section.layout === "fishbone") {
    const [problem, ...rest] = fields;
    body = (
      <div className="space-y-4">
        {renderField(problem)}
        <p className="text-sm text-muted-foreground">
          รูปแบบสาเหตุ: <b>หัวข้อ: รายละเอียด</b> เช่น &quot;ทีมขายและทีมจัดซื้อสื่อสารกันน้อย: ข้อมูลยอดขายไม่ถูกส่งต่อให้ทันวางแผนสั่งซื้อ&quot;
        </p>
        <FishboneCats id={`${pre}-cats`} value={asRows(data.cats)} onChange={(v) => set("cats", v)} />
        <div className="grid gap-4">
          {rest.filter((f) => f.k !== "cats").map((f) => (
            <div key={f.k}>{renderField(f)}</div>
          ))}
        </div>
      </div>
    );
  } else {
    const wideOnly = fields.length === 1;
    body = (
      <div className={cn("grid gap-4", !wideOnly && "md:grid-cols-2")}>
        {fields.map((f) => (
          <div key={f.k} className={cn(f.wide || f.type === "table" || f.type === "list" ? "md:col-span-2" : "")}>
            {renderField(f)}
          </div>
        ))}
      </div>
    );
  }

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-4 disabled:opacity-90">
      {section.id === "kpis" && (
        <>
          <KpiImport data={data} onChange={onChange} disabled={disabled} />
          {body}
          <KpiWeights rows={asRows(data.rows)} />
          <KpiGrades
            rows={asRows(data.rows)}
            act={data._act ?? {}}
            disabled={disabled}
            onAct={(k, v) => onChange({ ...data, _act: { ...(data._act ?? {}), [k]: v } })}
          />
        </>
      )}
      {section.id === "competency" && (
        <>
          <CompetencyPicker
            disabled={disabled}
            onAdd={(row) => onChange({ ...data, rows: [...asRows(data.rows), row] })}
          />
          {body}
        </>
      )}
      {section.id !== "kpis" && section.id !== "competency" && body}
    </fieldset>
  );
}
