"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { generateCell, generateSection } from "@/app/(app)/plans/[id]/ai-actions";
import type { Col, Field, Section } from "@/lib/form-schema";
import { isFilled, sectionMd, type Row, type SectionData } from "@/lib/form-logic";

/** แถบ AI ของทั้งหัวข้อ: ช่องความต้องการเพิ่มเติม + ปุ่มร่าง + ตัวอย่างก่อนใช้ */
export function AiBar({
  planId,
  section,
  data,
  onReq,
  onApply,
  beforeAi,
}: {
  planId: string;
  section: Section;
  data: SectionData;
  onReq: (text: string) => void;
  onApply: (generated: SectionData) => void;
  /** บันทึกข้อมูลล่าสุดลงฐานข้อมูลก่อนเรียก AI (AI อ่านจากฐานข้อมูล) */
  beforeAi: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<SectionData | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    if (!(await beforeAi())) {
      setBusy(false);
      setError("บันทึกข้อมูลล่าสุดไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองใหม่");
      return;
    }
    try {
      const res = await generateSection(planId, section.id);
      if (res.ok) setResult(res.data);
      else setError(res.error);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองกดอีกครั้ง");
    }
    setBusy(false);
  }

  const filled = isFilled(section, data);
  const note = section.fillEmptyOnly
    ? "AI จะเติมเฉพาะช่องที่ยังว่าง ช่องที่กรอกไว้แล้วจะไม่ถูกเปลี่ยน"
    : filled
      ? "ข้อมูลเดิมในหัวข้อนี้จะถูกแทนที่ด้วยร่างนี้เมื่อกด \"ใช้คำตอบนี้\""
      : "ตรวจทานร่างก่อนกด \"ใช้คำตอบนี้\" แล้วแก้ไขต่อได้";

  return (
    <div className="space-y-3 rounded-xl border bg-card p-3 md:p-4 print:hidden">
      <div className="space-y-1.5">
        <Label htmlFor={`req-${section.id}`} className="gap-2">
          <Sparkles className="size-4" />
          ความต้องการเพิ่มเติมสำหรับ AI (ไม่บังคับ)
        </Label>
        <Textarea
          id={`req-${section.id}`}
          rows={2}
          value={data._req ?? ""}
          onChange={(e) => onReq(e.target.value)}
          placeholder="เช่น เน้นการขยายตลาดออนไลน์ และให้สอดคล้องกับเป้าหมายลดสต็อกค้าง"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={() => void run()}>
          <Sparkles className="size-4" />
          {busy ? "กำลังคิด… อาจใช้เวลา 20–60 วินาที" : "ให้ AI ช่วยร่าง"}
        </Button>
        <p className="text-sm text-muted-foreground">{note}</p>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Dialog open={result !== null} onOpenChange={(o) => !o && !busy && setResult(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>ร่างจาก AI: {section.th}</DialogTitle>
            <DialogDescription>{note}</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[50vh] overflow-y-auto rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
            {result ? sectionMd(section, result, "ร่างจาก AI") : ""}
          </pre>
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => setResult(null)} disabled={busy}>
              ยกเลิก
            </Button>
            <Button type="button" variant="outline" className="h-11 md:h-9" onClick={() => void run()} disabled={busy}>
              {busy ? "กำลังคิด…" : "ลองใหม่"}
            </Button>
            <Button
              type="button"
              className="h-11 md:h-9"
              disabled={busy}
              onClick={() => {
                if (result) onApply(result);
                setResult(null);
              }}
            >
              ใช้คำตอบนี้
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** ปุ่ม AI รายช่อง (เฉพาะคอลัมน์ที่ทำเครื่องหมาย ai: true) */
export function CellAi({
  planId,
  section,
  field,
  col,
  row,
  onUse,
  beforeAi,
}: {
  planId: string;
  section: Section;
  field: Field;
  col: Col;
  row: Row;
  onUse: (text: string) => void;
  beforeAi: () => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState<string | null>(null);

  async function run() {
    if (!(field.cols ?? []).some((c) => c.k !== col.k && (row[c.k] ?? "").trim())) {
      setError("กรอกช่องอื่นของแถวนี้ก่อน เช่น หน่วยงาน / ฝ่าย");
      return;
    }
    setBusy(true);
    setError("");
    if (!(await beforeAi())) {
      setBusy(false);
      setError("บันทึกข้อมูลล่าสุดไม่สำเร็จ ลองใหม่อีกครั้ง");
      return;
    }
    try {
      const res = await generateCell(planId, section.id, field.k, col.k, row);
      if (res.ok) setText(res.data);
      else setError(res.error);
    } catch {
      setError("เชื่อมต่อไม่สำเร็จ ลองกดอีกครั้ง");
    }
    setBusy(false);
  }

  const hasOld = (row[col.k] ?? "").trim() !== "";
  return (
    <div className="mt-1.5 space-y-1.5 print:hidden">
      <Button type="button" variant="outline" size="sm" className="h-9 md:h-7" disabled={busy} onClick={() => void run()}>
        <Sparkles className="size-3.5" />
        {busy ? "กำลังคิด…" : `AI ช่วยร่าง ${col.label}`}
      </Button>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {text !== null && (
        <div className="space-y-2 rounded-lg border bg-muted p-2 text-sm">
          <p className="whitespace-pre-wrap">{text}</p>
          {hasOld && <p className="text-xs text-muted-foreground">ข้อความเดิมในช่องนี้จะถูกแทนที่</p>}
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              className="h-9 md:h-7"
              onClick={() => {
                onUse(text);
                setText(null);
              }}
            >
              ใช้คำตอบนี้
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 md:h-7" disabled={busy} onClick={() => void run()}>
              ลองใหม่
            </Button>
            <Button type="button" variant="ghost" size="sm" className="h-9 md:h-7" onClick={() => setText(null)}>
              ยกเลิก
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
