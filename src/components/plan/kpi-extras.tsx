"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SECTION_BY_ID, KPI_SAMPLE } from "@/lib/form-schema";
import { asRows, type Row, type SectionData } from "@/lib/form-logic";
import { actKey, deptGrades, fmt, gradeNote, gradeOf, kpiRows, kpiRule, weightGroups } from "@/lib/kpi";
import { useIsDesktop } from "@/lib/use-is-desktop";
import { cn } from "@/lib/utils";

const GRADE_CLASS: Record<string, string> = {
  A: "bg-ok-soft text-ok",
  B: "bg-gold/40 text-foreground",
  C: "bg-warn-soft text-warn",
  D: "bg-destructive/10 text-destructive",
};

function GradeBadge({ g }: { g: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-sm font-semibold",
        GRADE_CLASS[g] ?? "bg-muted text-muted-foreground",
      )}
      aria-label={g ? `เกรด ${g}` : "ยังไม่มีเกรด"}
    >
      {g || "—"}
    </span>
  );
}

/** ปุ่มนำเข้า KPI ตัวอย่าง 30 ข้อ (ถามยืนยันถ้ามีข้อมูลเดิม) */
export function KpiImport({
  data,
  onChange,
  disabled,
}: {
  data: SectionData;
  onChange: (d: SectionData) => void;
  disabled: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  const rows = asRows(data.rows);
  const hasRows = rows.length > 0;
  const run = () => {
    onChange({ ...data, rows: KPI_SAMPLE.map((r) => ({ ...r })) as Row[] });
    setConfirm(false);
  };
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-dashed p-3 sm:flex-row sm:items-center">
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-8"
        disabled={disabled}
        onClick={() => (hasRows ? setConfirm(true) : run())}
      >
        <Download className="size-4" />
        นำเข้า KPI ตัวอย่าง 30 ข้อ
      </Button>
      <span className="text-sm text-muted-foreground">
        ธุรกิจหลอดไฟและโคมไฟ ค่าเกณฑ์เป็นตัวอย่าง ควรปรับตามค่าจริงของบริษัท
      </span>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>แทนที่ KPI เดิมทั้งหมดไหม?</AlertDialogTitle>
            <AlertDialogDescription>
              KPI ที่กรอกไว้ในตารางจะถูกแทนที่ด้วย KPI ตัวอย่าง 30 ข้อ และกู้คืนไม่ได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={run}>
              แทนที่ด้วยตัวอย่าง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** น้ำหนักรายฝ่าย + เกณฑ์ที่ต้องตรวจ */
export function KpiWeights({ rows }: { rows: Row[] }) {
  const groups = weightGroups(rows);
  const issues = kpiRows(rows)
    .map((r) => ({ r, i: kpiRule(r).issues }))
    .filter((x) => x.i.length);
  if (!groups.length && !issues.length) return null;
  return (
    <div className="space-y-2 rounded-xl border bg-card p-3" aria-live="polite">
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">น้ำหนักรวมรายฝ่าย:</span>
          {groups.map((g) => {
            const good = Math.abs(g.sum - 100) < 0.01;
            return (
              <span
                key={g.dept}
                className={cn(
                  "rounded-full px-2.5 py-0.5 tabular-nums",
                  good ? "bg-ok-soft text-ok" : "bg-destructive/10 text-destructive",
                )}
              >
                {g.dept} {fmt(g.sum)}% {good ? "" : "(ต้องรวมเป็น 100%)"}
              </span>
            );
          })}
        </div>
      )}
      {issues.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">เกณฑ์ที่ต้องตรวจ:</span>
          {issues.map((x, i) => (
            <span key={i} className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-destructive">
              {((x.r.code || x.r.kpi) ?? "").trim().slice(0, 30)}: {x.i.join(" · ")}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/** กรอกผลจริงของแต่ละ KPI แล้วให้เกรดรายตัวและรายฝ่าย */
export function KpiGrades({
  rows,
  act,
  onAct,
  disabled,
}: {
  rows: Row[];
  act: Record<string, string>;
  onAct: (key: string, value: string) => void;
  disabled: boolean;
}) {
  const isDesktop = useIsDesktop();
  const list = kpiRows(rows);
  const depts = deptGrades(rows, act).filter((x) => x.n);

  return (
    <section className="space-y-3" aria-labelledby="kpi-grade-title">
      <div>
        <h3 id="kpi-grade-title" className="text-lg font-medium">
          ผลจริงและเกรด KPI
        </h3>
        <p className="text-sm text-muted-foreground">กรอกผลจริงของแต่ละ KPI ระบบจะให้เกรด A–D ตามเกณฑ์ที่ตั้งไว้</p>
      </div>
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          เพิ่ม KPI ในตารางด้านบนก่อน แล้วจึงกรอกผลจริงได้
        </p>
      ) : isDesktop ? (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-muted text-left">
                {["รหัส", "ฝ่าย", "KPI", "B (Target)", "น้ำหนัก %", "ผลจริง", "เกรด"].map((h) => (
                  <th key={h} className="px-2 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r, i) => {
                const k = actKey(r);
                const v = act[k] ?? "";
                return (
                  <tr key={k + i} className="border-t align-top">
                    <td className="px-2 py-2">{r.code}</td>
                    <td className="min-w-36 px-2 py-2">{r.dept}</td>
                    <td className="min-w-52 px-2 py-2">{r.kpi}</td>
                    <td className="px-2 py-2">{r.b}</td>
                    <td className="px-2 py-2 tabular-nums">{r.weight}</td>
                    <td className="min-w-28 px-1.5 py-1.5">
                      <Input
                        value={v}
                        disabled={disabled}
                        inputMode="decimal"
                        placeholder={r.unit}
                        aria-label={`ผลจริง ${r.kpi}`}
                        onChange={(e) => onAct(k, e.target.value)}
                        className="h-9"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-col items-start gap-1">
                        <GradeBadge g={gradeOf(r, v)} />
                        {gradeNote(r, v) && <small className="text-muted-foreground">{gradeNote(r, v)}</small>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r, i) => {
            const k = actKey(r);
            const v = act[k] ?? "";
            return (
              <div key={k + i} className="space-y-2 rounded-xl border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">{r.kpi}</p>
                    <p className="text-sm text-muted-foreground">
                      {r.code} · {r.dept} · เป้า {r.b} · น้ำหนัก {r.weight}%
                    </p>
                  </div>
                  <GradeBadge g={gradeOf(r, v)} />
                </div>
                <Input
                  value={v}
                  disabled={disabled}
                  inputMode="decimal"
                  placeholder={r.unit ? `ผลจริง (${r.unit})` : "ผลจริง"}
                  aria-label={`ผลจริง ${r.kpi}`}
                  onChange={(e) => onAct(k, e.target.value)}
                  className="h-11"
                />
                {gradeNote(r, v) && <p className="text-sm text-muted-foreground">{gradeNote(r, v)}</p>}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">เกรดรายฝ่าย:</span>
        {depts.length === 0 ? (
          <span className="text-muted-foreground">ยังไม่มีผลจริง</span>
        ) : (
          depts.map((x) => (
            <span key={x.dept} className="inline-flex items-center gap-2 rounded-full bg-muted px-2.5 py-0.5 tabular-nums">
              {x.dept} <GradeBadge g={x.grade} />
              {x.avg !== null && <span>({x.avg.toFixed(2)}{x.n < x.tot ? ` · กรอก ${x.n}/${x.tot}` : ""})</span>}
            </span>
          ))
        )}
      </div>
    </section>
  );
}

export const KPI_SECTION = SECTION_BY_ID.kpis;
