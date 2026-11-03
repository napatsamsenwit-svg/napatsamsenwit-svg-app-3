"use client";

import { MapPin, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Col, Field } from "@/lib/form-schema";
import { asList, asRows, asText, coordUrl, mapState, type Row } from "@/lib/form-logic";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { cn } from "@/lib/utils";

const NONE = "__none__";

/** ช่องกรอกเดี่ยว: ข้อความ / ข้อความยาว / ตัวเลข / ตัวเลือก */
export function Control({
  type,
  value,
  onChange,
  id,
  ph,
  options,
  keep,
  rows,
  label,
  compact,
}: {
  type: Col["type"];
  value: string;
  onChange: (v: string) => void;
  id: string;
  ph?: string;
  options?: string[];
  keep?: boolean;
  rows?: number;
  label: string;
  compact?: boolean;
}) {
  if (type === "textarea") {
    return (
      <Textarea
        id={id}
        value={value}
        rows={rows ?? (compact ? 2 : 3)}
        placeholder={ph}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className={cn(compact ? "min-h-12" : "min-h-20")}
      />
    );
  }
  if (type === "select") {
    const list = options ?? [];
    const items = [
      { value: NONE, label: "— เลือก —" },
      ...(keep && value && !list.includes(value) ? [{ value, label: value }] : []),
      ...list.map((o) => ({ value: o, label: o })),
    ];
    return (
      <Select
        items={items}
        value={value || null}
        onValueChange={(v) => onChange(!v || v === NONE ? "" : String(v))}
      >
        <SelectTrigger id={id} aria-label={label} className="h-11 w-full md:h-9">
          <SelectValue placeholder="— เลือก —" />
        </SelectTrigger>
        <SelectContent className="max-h-80">
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Input
      id={id}
      value={value}
      placeholder={ph}
      aria-label={label}
      inputMode={type === "number" ? "decimal" : undefined}
      onChange={(e) => onChange(e.target.value)}
      className="h-11 md:h-9"
    />
  );
}

/** รายการเพิ่ม/ลบได้ (หนึ่งข้อต่อหนึ่งช่อง) */
export function ListField({
  field,
  value,
  onChange,
  idPrefix,
}: {
  field: Field;
  value: string[];
  onChange: (v: string[]) => void;
  idPrefix: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{field.label}</span>
      {value.length === 0 && <p className="text-sm text-muted-foreground">ยังไม่มีข้อ กด &quot;เพิ่มข้อ&quot; เพื่อเริ่ม</p>}
      <ol className="space-y-2">
        {value.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-5 shrink-0 text-right text-sm text-muted-foreground tabular-nums">{i + 1}</span>
            <Input
              id={`${idPrefix}-${i}`}
              value={item}
              aria-label={`${field.label} ข้อ ${i + 1}`}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
              className="h-11 md:h-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 shrink-0 md:size-9"
              aria-label={`ลบข้อ ${i + 1}`}
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              <X className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" className="h-11 md:h-8" onClick={() => onChange([...value, ""])}>
        <Plus className="size-4" />
        เพิ่มข้อ
      </Button>
    </div>
  );
}

/** ตาราง: เดสก์ท็อปเป็นตาราง มือถือเป็นการ์ดซ้อนต่อแถว */
export function TableField({
  field,
  value,
  onChange,
  idPrefix,
  cellExtra,
}: {
  field: Field;
  value: Row[];
  onChange: (v: Row[]) => void;
  idPrefix: string;
  /** ตำแหน่งสำหรับปุ่มเสริมใต้ช่อง (เช่น ปุ่ม AI รายช่อง) */
  cellExtra?: (col: Col, row: Row, rowIndex: number) => React.ReactNode;
}) {
  const isDesktop = useIsDesktop();
  const cols = field.cols ?? [];
  const setCell = (ri: number, ck: string, v: string) =>
    onChange(value.map((r, i) => (i === ri ? { ...r, [ck]: v } : r)));
  const addRow = () => onChange([...value, Object.fromEntries(cols.map((c) => [c.k, ""])) as Row]);
  const delRow = (ri: number) => onChange(value.filter((_, i) => i !== ri));

  const addButton = (
    <Button type="button" variant="outline" className="h-11 md:h-8" onClick={addRow}>
      <Plus className="size-4" />
      เพิ่มแถว
    </Button>
  );

  if (value.length === 0) {
    return (
      <div className="space-y-3">
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          ยังไม่มีข้อมูล กด &quot;เพิ่มแถว&quot; หรือใช้ AI ช่วยร่าง
        </p>
        {addButton}
      </div>
    );
  }

  if (!isDesktop) {
    return (
      <div className="space-y-3">
        {value.map((r, ri) => (
          <div key={ri} className="space-y-3 rounded-xl border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {field.label} แถว {ri + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-11"
                aria-label={`ลบแถว ${ri + 1}`}
                onClick={() => delRow(ri)}
              >
                <X className="size-4" />
              </Button>
            </div>
            {cols.map((c) => (
              <div key={c.k} className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-${ri}-${c.k}`} className="text-sm text-muted-foreground">
                  {c.label}
                </Label>
                <Control
                  id={`${idPrefix}-${ri}-${c.k}`}
                  type={c.type}
                  value={r[c.k] ?? ""}
                  ph={c.ph}
                  options={c.options}
                  label={`${c.label} แถว ${ri + 1}`}
                  onChange={(v) => setCell(ri, c.k, v)}
                />
                {cellExtra?.(c, r, ri)}
              </div>
            ))}
          </div>
        ))}
        {addButton}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-left">
              <th className="w-10 px-2 py-2 text-center font-medium">#</th>
              {cols.map((c) => (
                <th key={c.k} className="px-2 py-2 font-medium whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="w-12 px-2 py-2">
                <span className="sr-only">ลบแถว</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {value.map((r, ri) => (
              <tr key={ri} className="border-t align-top">
                <td className="px-2 py-2 text-center text-muted-foreground tabular-nums">{ri + 1}</td>
                {cols.map((c) => (
                  <td key={c.k} className="px-1.5 py-1.5" style={{ minWidth: c.w ?? 140 }}>
                    <Control
                      id={`${idPrefix}-${ri}-${c.k}`}
                      type={c.type}
                      value={r[c.k] ?? ""}
                      ph={c.ph}
                      options={c.options}
                      compact
                      label={`${c.label} แถว ${ri + 1}`}
                      onChange={(v) => setCell(ri, c.k, v)}
                    />
                    {cellExtra?.(c, r, ri)}
                  </td>
                ))}
                <td className="px-1 py-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-9"
                    aria-label={`ลบแถว ${ri + 1}`}
                    onClick={() => delRow(ri)}
                  >
                    <X className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {addButton}
    </div>
  );
}

/** ช่องลิงก์ Google Maps พร้อมการ์ดตรวจลิงก์ */
export function MapField({
  field,
  value,
  location,
  onChange,
  id,
  onMessage,
}: {
  field: Field;
  value: string;
  location: string;
  onChange: (v: string) => void;
  id: string;
  onMessage: (text: string) => void;
}) {
  const st = mapState(value);
  const findUrl = location.trim()
    ? "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(location.trim())
    : "";
  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={value}
        placeholder={field.ph}
        aria-label={field.label}
        className="h-11 md:h-9"
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          const cu = coordUrl(value);
          if (cu) onChange(cu);
        }}
      />
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg border p-3 text-sm",
          st.kind === "ok" && "border-ok/40 bg-ok-soft",
          st.kind === "bad" && "border-destructive/40",
        )}
      >
        <MapPin
          className={cn(
            "size-5 shrink-0",
            st.kind === "ok" ? "text-ok" : st.kind === "bad" ? "text-destructive" : "text-muted-foreground",
          )}
        />
        {st.kind === "empty" && <span className="text-muted-foreground">ยังไม่ได้ปักหมุด</span>}
        {st.kind === "bad" && (
          <span className="text-destructive">ลิงก์นี้ไม่ใช่ลิงก์ Google Maps ตรวจแล้ววางใหม่ หรือวางพิกัดแทน</span>
        )}
        {st.kind === "ok" && (
          <span className="min-w-0 flex-1">
            <b className="block">บันทึกหมุดแล้ว</b>
            <small className="block truncate text-muted-foreground">{st.label}</small>
          </span>
        )}
        {st.kind === "ok" && (
          <a className="shrink-0 font-medium underline underline-offset-4" href={st.url} target="_blank" rel="noopener noreferrer">
            เปิดหมุด
          </a>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a
          className="text-sm font-medium underline underline-offset-4"
          href={findUrl || "https://www.google.com/maps"}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => {
            if (!findUrl) {
              e.preventDefault();
              onMessage('กรอก "ที่ตั้ง" ก่อน แล้วจึงค้นหาใน Google Maps');
            }
          }}
        >
          ค้นหา &quot;ที่ตั้ง&quot; ใน Google Maps
        </a>
      </div>
      <p className="text-sm text-muted-foreground">
        ปักหมุดใน Google Maps แล้วกด แชร์ → คัดลอกลิงก์ มาวางในช่องนี้ หรือคัดลอกพิกัด (เช่น 13.6824, 100.5418) มาวางก็ได้
      </p>
    </div>
  );
}

export { asList, asRows, asText };
