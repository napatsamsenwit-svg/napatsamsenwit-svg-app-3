"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Printer, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PlanProgress } from "@/components/plan-progress";
import { StatusPill } from "@/components/status-pill";
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
import { Card } from "@/components/ui/card";
import { SECTIONS, SECTION_BY_ID, type Section } from "@/lib/form-schema";
import { asRows, asText, hasVal, isFilled, normalizeSection, type SectionData } from "@/lib/form-logic";
import { weightGroups } from "@/lib/kpi";
import { asStatus, STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";
import { SAMPLE_SECTIONS } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
import { AiBar, CellAi } from "./ai-controls";
import { BmcImage, OrgImage } from "./canvas-exports";
import { FishboneDiagram } from "./fishbone-diagram";
import { SectionBody } from "./section-body";

export type SectionState = { data: SectionData; status: SectionStatus };
export type ReviewItem = { action: string; note: string; created_at: string };

type SaveState = "idle" | "saving" | "saved" | "error";

const ACTION_TEXT: Record<string, string> = {
  submitted: "ส่งตรวจ",
  withdrawn: "ถอนกลับมาแก้",
  approved: "อนุมัติ",
  returned: "ส่งกลับแก้",
};

const isLocked = (st: SectionStatus) => st === "review" || st === "approved";

function buildInitial(initial: Record<string, { data: unknown; status: string }>) {
  const out: Record<string, SectionState> = {};
  SECTIONS.forEach((s) => {
    const row = initial[s.id];
    out[s.id] = {
      data: normalizeSection(s, row?.data),
      status: row ? asStatus(row.status) : "empty",
    };
  });
  return out;
}

export function PlanEditor({
  planId,
  title,
  mode,
  initial,
  reviews,
  reviewPanel,
}: {
  planId: string;
  title: string;
  mode: "owner" | "reviewer";
  initial: Record<string, { data: unknown; status: string }>;
  reviews: Record<string, ReviewItem[]>;
  /** พื้นที่เสริมใต้เนื้อหาของหัวข้อ (ผู้ตรวจใช้แสดงปุ่มอนุมัติ/ส่งกลับ) */
  reviewPanel?: (sectionKey: string, status: SectionStatus) => React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const readOnly = mode === "reviewer";

  const [sections, setSections] = useState<Record<string, SectionState>>(() => buildInitial(initial));
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "err" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // ผู้ตรวจดูอย่างเดียว: ซิงก์สถานะใหม่ทุกครั้งที่เซิร์ฟเวอร์ส่งข้อมูลมาให้ (หลังตัดสินแล้วรีเฟรช)
  // ปรับ state ระหว่างเรนเดอร์ ตามวิธีที่ React แนะนำ แทนการเรียก setState ใน effect
  const [syncedInitial, setSyncedInitial] = useState(initial);
  if (readOnly && syncedInitial !== initial) {
    setSyncedInitial(initial);
    setSections(buildInitial(initial));
  }

  const pending = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latest = useRef(sections);
  useEffect(() => {
    latest.current = sections;
  }, [sections]);

  const askedKey = params.get("s");
  const current: Section = (askedKey && SECTION_BY_ID[askedKey]) || SECTIONS[0];
  const cur = sections[current.id];
  const index = SECTIONS.findIndex((s) => s.id === current.id);
  const locked = readOnly || isLocked(cur.status);

  const flush = useCallback(async () => {
    clearTimeout(timer.current);
    const keys = [...pending.current];
    if (keys.length === 0) return true;
    setSaveState("saving");
    let ok = true;
    for (const key of keys) {
      const st = latest.current[key];
      if (!st) continue;
      pending.current.delete(key);
      const payload = { data: st.data as unknown as Json, status: st.status };
      const upd = await supabase
        .from("plan_sections")
        .update(payload)
        .eq("plan_id", planId)
        .eq("section_key", key)
        .select("section_key");
      let error = upd.error;
      if (!error && (upd.data?.length ?? 0) === 0) {
        const ins = await supabase.from("plan_sections").insert({ plan_id: planId, section_key: key, ...payload });
        error = ins.error;
      }
      if (error) {
        ok = false;
        pending.current.add(key);
      }
    }
    setSaveState(ok ? "saved" : "error");
    return ok;
  }, [planId, supabase]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current.size > 0) {
        void flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  const queueSave = useCallback(
    (key: string) => {
      pending.current.add(key);
      setSaveState("saving");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 1000);
    },
    [flush],
  );

  const edit = useCallback(
    (key: string, data: SectionData) => {
      const sec = SECTION_BY_ID[key];
      setSections((prev) => {
        const old = prev[key];
        if (!old || isLocked(old.status)) return prev;
        const next: SectionData = { ...data };
        delete next._sample;
        const status: SectionStatus =
          old.status === "returned" ? "returned" : isFilled(sec, next) ? "filling" : "empty";
        return { ...prev, [key]: { data: next, status } };
      });
      setMessage(null);
      queueSave(key);
    },
    [queueSave],
  );

  const go = useCallback(
    (key: string) => {
      void flush();
      setMessage(null);
      router.replace(`${pathname}?s=${key}`, { scroll: false });
      window.scrollTo({ top: 0 });
    },
    [flush, pathname, router],
  );

  const statuses = SECTIONS.map((s) => sections[s.id].status);
  const anyFilled = SECTIONS.some((s) => isFilled(s, sections[s.id].data));
  const hasSample = SECTIONS.some((s) => sections[s.id].data._sample === true);

  function applySample() {
    setSections((prev) => {
      const next = { ...prev };
      Object.entries(SAMPLE_SECTIONS).forEach(([key, raw]) => {
        const sec = SECTION_BY_ID[key];
        if (!sec || isFilled(sec, prev[key].data) || isLocked(prev[key].status)) return;
        next[key] = { data: { ...normalizeSection(sec, raw), _sample: true }, status: "filling" };
        pending.current.add(key);
      });
      return next;
    });
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 300);
    toast.success("ใส่ข้อมูลตัวอย่างแล้ว ลองเปิดดูทีละหัวข้อ");
  }

  function clearSample() {
    setSections((prev) => {
      const next = { ...prev };
      SECTIONS.forEach((sec) => {
        const st = prev[sec.id];
        if (st.data._sample === true && !isLocked(st.status)) {
          next[sec.id] = { data: normalizeSection(sec, {}), status: "empty" };
          pending.current.add(sec.id);
        }
      });
      return next;
    });
    setConfirmClear(false);
    setSaveState("saving");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 300);
    toast.success("ล้างข้อมูลตัวอย่างแล้ว ข้อมูลที่คุณกรอกเองไม่ถูกลบ");
  }

  /** AI อ่านข้อมูลจากฐานข้อมูล จึงบันทึกค่าล่าสุดให้เสร็จก่อนเรียก */
  const beforeAi = useCallback(() => flush(), [flush]);

  function applyAi(sec: Section, generated: SectionData) {
    const base = cur.data;
    const next: SectionData = { ...base };
    sec.fields.forEach((f) => {
      if (f.noAI || f.type === "cmpEdits") return;
      if (sec.fillEmptyOnly) {
        if (!hasVal(f, base[f.k]) && hasVal(f, generated[f.k])) next[f.k] = generated[f.k];
      } else {
        next[f.k] = generated[f.k];
      }
    });
    edit(sec.id, next);
    setMessage({ text: sec.fillEmptyOnly ? "เติมช่องว่างแล้ว ตรวจทานแล้วส่งตรวจได้" : "ใช้ร่างจาก AI แล้ว ตรวจทานและแก้ไขต่อได้", kind: "ok" });
  }

  function validate(sec: Section, d: SectionData) {
    if (!sec.dictOnly && !isFilled(sec, d)) return "ยังส่งตรวจไม่ได้ กรอกข้อมูลอย่างน้อยหนึ่งช่องก่อน";
    if (sec.id === "kpis") {
      const bad = weightGroups(asRows(d.rows)).filter((g) => Math.abs(g.sum - 100) >= 0.01);
      if (bad.length) {
        return "ยังส่งตรวจไม่ได้ น้ำหนัก KPI ของแต่ละฝ่ายต้องรวมเป็น 100% ตอนนี้ " + bad.map((g) => `${g.dept} = ${g.sum}%`).join(", ");
      }
    }
    return "";
  }

  async function submit() {
    const problem = validate(current, cur.data);
    if (problem) {
      setMessage({ text: problem, kind: "err" });
      return;
    }
    setBusy(true);
    pending.current.add(current.id);
    const saved = await flush();
    if (!saved) {
      setBusy(false);
      setMessage({ text: "บันทึกไม่สำเร็จ เช็กอินเทอร์เน็ตแล้วลองส่งตรวจอีกครั้ง", kind: "err" });
      return;
    }
    const { error } = await supabase.rpc("submit_section", { p_plan_id: planId, p_section_key: current.id });
    setBusy(false);
    if (error) {
      setMessage({ text: "ส่งตรวจไม่สำเร็จ ลองใหม่อีกครั้ง", kind: "err" });
      return;
    }
    setSections((prev) => ({ ...prev, [current.id]: { ...prev[current.id], status: "review" } }));
    toast.success("ส่งตรวจแล้ว หัวข้อนี้ถูกล็อกระหว่างรอผู้ตรวจ");
    router.refresh();
  }

  async function withdraw() {
    setBusy(true);
    const { error } = await supabase.rpc("withdraw_section", { p_plan_id: planId, p_section_key: current.id });
    setBusy(false);
    if (error) {
      setMessage({ text: "ถอนกลับไม่สำเร็จ อาจมีผู้ตรวจตัดสินไปแล้ว รีเฟรชหน้านี้เพื่อดูสถานะล่าสุด", kind: "err" });
      return;
    }
    setSections((prev) => ({ ...prev, [current.id]: { ...prev[current.id], status: "filling" } }));
    toast.success("ถอนกลับมาแก้ไขแล้ว");
    router.refresh();
  }

  const history = reviews[current.id] ?? [];
  const lastDecision = [...history].reverse().find((h) => h.action === "returned" || h.action === "approved");

  const cardPill: Record<SectionStatus, string> = {
    empty: "hidden",
    filling: "bg-gold/30 text-foreground",
    review: "bg-gold text-gold-foreground",
    approved: "bg-ok-soft text-ok",
    returned: "bg-warn-soft text-warn",
  };
  const cardText: Record<SectionStatus, string> = { ...STATUS_TEXT, filling: "กรอกแล้ว" };

  const navGrid = (
    <nav aria-label="หัวข้อทั้ง 13" className="grid grid-cols-2 gap-1.5 md:grid-cols-4 lg:grid-cols-7">
      {SECTIONS.map((s, i) => {
        const active = s.id === current.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => go(s.id)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "flex min-h-24 flex-col gap-1 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:border-ring",
              active && "border-ring bg-accent shadow-[inset_0_-3px_0_var(--ring)]",
            )}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="font-latin text-xs font-semibold tabular-nums text-ring dark:text-gold">{String(s.no).padStart(2, "0")}</span>
              <span className={cn("rounded-full px-2 py-1 text-[11px] leading-none font-medium", cardPill[statuses[i]])}>
                {cardText[statuses[i]]}
              </span>
            </span>
            <span className={cn("text-sm leading-snug", active && "font-semibold")}>{s.th}</span>
            <span className="font-latin text-[11px] leading-snug text-muted-foreground">{s.en}</span>
          </button>
        );
      })}
      {!readOnly && (
        <Link
          href={`/plans/${planId}/summary`}
          className="flex min-h-24 flex-col gap-1 rounded-lg border bg-card px-2.5 py-2 text-left transition-colors hover:border-ring"
        >
          <FileText className="size-4" />
          <span className="text-sm leading-snug font-medium">สรุปและส่งออก</span>
          <span className="text-xs leading-snug text-muted-foreground">Summary &amp; Export</span>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="print:block">
      <div className="min-w-0 space-y-5 pb-20">
        <div className="space-y-3 print:hidden">
          <div className="relative -mt-6 left-1/2 w-screen -translate-x-1/2 bg-brand-surface px-4 py-5 text-brand-surface-foreground">
            <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-x-8 gap-y-4">
              <div className="min-w-0 flex-1 basis-[420px]">
                <p className="font-latin text-xs font-semibold tracking-[0.14em] text-gold uppercase">ANNA HR · BUSINESS PLANNING</p>
                <h1 className="mt-1 mb-1 text-2xl leading-tight font-bold text-balance md:text-[32px]">
                  AI-ANNA Business Blueprint (พิมพ์เขียวธุรกิจ)
                </h1>
                <p className="text-sm text-[#C9CDE0]">
                  13 หัวข้อ ตั้งแต่ข้อมูลบริษัทจนถึงแผนพัฒนารายบุคคล · ข้อมูลบันทึกอัตโนมัติ · สิทธิ์ของคุณ:{" "}
                  {readOnly ? "ดูแผนและตรวจ (ดูได้อย่างเดียว)" : "กรอกและส่งตรวจ"}
                  {title ? ` · ${title}` : ""}
                </p>
              </div>
              <div className="w-full min-w-0 md:w-[300px]">
                <PlanProgress statuses={statuses} total={SECTIONS.length} onDark />
              </div>
            </div>
          </div>
          <div className="print:hidden">{navGrid}</div>

          {!readOnly && !anyFilled && (
            <Card className="flex flex-col items-center gap-3 p-6 text-center">
              <Sparkles className="size-10 text-muted-foreground" />
              <p>แผนของคุณยังว่างอยู่ เริ่มกรอกหัวข้อแรกได้เลย หรือดูหน้าตาตอนมีข้อมูลก่อน</p>
              <Button type="button" variant="outline" className="h-11" onClick={applySample}>
                ลองใส่ข้อมูลตัวอย่าง
              </Button>
            </Card>
          )}
          {!readOnly && hasSample && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-warn-soft p-3 text-sm text-warn">
              <span className="flex-1">หัวข้อที่ขึ้นป้ายตัวอย่างเป็นข้อมูลสมมติ แก้ไขหรือล้างได้</span>
              <Button type="button" variant="outline" className="h-11 md:h-8" onClick={() => setConfirmClear(true)}>
                <Trash2 className="size-4" />
                ล้างข้อมูลตัวอย่าง
              </Button>
            </div>
          )}
        </div>

        <section aria-labelledby="sec-title" className="space-y-4" data-section={current.id}>
          <header className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm text-muted-foreground">
                หัวข้อ {current.no} จาก {SECTIONS.length}
              </p>
              <h2 id="sec-title" className="text-xl font-semibold md:text-2xl">
                {current.th} <span className="text-base font-normal text-muted-foreground">{current.en}</span>
              </h2>
            </div>
            <StatusPill status={cur.status} className="mt-1" />
            {cur.data._sample === true && (
              <span className="mt-1 rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">ตัวอย่าง</span>
            )}
            <p className="basis-full text-muted-foreground">{current.desc}</p>
          </header>

          {cur.status === "returned" && lastDecision?.action === "returned" && (
            <div className="rounded-xl border border-warn/40 bg-warn-soft p-3 text-sm text-warn" role="status">
              <b>ผู้ตรวจส่งกลับให้แก้:</b> {lastDecision.note}
            </div>
          )}
          {cur.status === "approved" && (
            <div className="rounded-xl border border-ok/40 bg-ok-soft p-3 text-sm text-ok" role="status">
              หัวข้อนี้อนุมัติแล้ว{lastDecision?.action === "approved" && lastDecision.note ? `: ${lastDecision.note}` : ""}
            </div>
          )}
          {cur.status === "review" && !readOnly && (
            <div className="rounded-xl border bg-muted p-3 text-sm" role="status">
              ส่งตรวจแล้ว หัวข้อนี้ถูกล็อกระหว่างรอผู้ตรวจ ถ้าอยากแก้ กด &quot;ถอนกลับมาแก้&quot;
            </div>
          )}

          {!locked && (
            <AiBar
              key={current.id}
              planId={planId}
              section={current}
              data={cur.data}
              onReq={(text) => edit(current.id, { ...cur.data, _req: text })}
              onApply={(g) => applyAi(current, g)}
              beforeAi={beforeAi}
            />
          )}

          <SectionBody
            section={current}
            data={cur.data}
            disabled={locked}
            onChange={(d) => edit(current.id, d)}
            onMessage={(text) => setMessage({ text, kind: "err" })}
            cellExtra={(f, c, r, ri) =>
              c.ai && !locked ? (
                <CellAi
                  planId={planId}
                  section={current}
                  field={f}
                  col={c}
                  row={r}
                  beforeAi={beforeAi}
                  onUse={(text) =>
                    edit(current.id, {
                      ...cur.data,
                      [f.k]: asRows(cur.data[f.k]).map((x, i) => (i === ri ? { ...x, [c.k]: text } : x)),
                    })
                  }
                />
              ) : null
            }
          />

          {current.id === "fishbone" && <FishboneDiagram section={current} data={cur.data} />}
          {current.id === "bmc" && <BmcImage data={cur.data} company={asText(sections.company?.data.name)} />}
          {current.id === "org" && <OrgImage data={cur.data} company={asText(sections.company?.data.name)} />}

          {reviewPanel?.(current.id, cur.status)}

          {history.length > 0 && (
            <details className="rounded-xl border bg-card p-3 text-sm print:hidden">
              <summary className="cursor-pointer font-medium">ประวัติการตรวจ ({history.length})</summary>
              <ul className="mt-2 space-y-2">
                {[...history].reverse().map((h, i) => (
                  <li key={i} className="flex flex-wrap gap-x-3">
                    <span className="font-medium">{ACTION_TEXT[h.action] ?? h.action}</span>
                    <span className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                    {h.note && <span className="basis-full">{h.note}</span>}
                  </li>
                ))}
              </ul>
            </details>
          )}

          <div className="flex items-center justify-between gap-2 pt-2 print:hidden">
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={index === 0}
              onClick={() => go(SECTIONS[index - 1].id)}
            >
              <ChevronLeft className="size-4" />
              ก่อนหน้า
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              disabled={index === SECTIONS.length - 1}
              onClick={() => go(SECTIONS[index + 1].id)}
            >
              ถัดไป
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 lg:pl-[20rem]">
          <p
            className={cn(
              "min-w-0 flex-1 text-sm",
              message?.kind === "err" ? "text-destructive" : "text-muted-foreground",
            )}
            role="status"
            aria-live="polite"
          >
            {message ? (
              message.text
            ) : saveState === "saving" ? (
              "กำลังบันทึก…"
            ) : saveState === "error" ? (
              <button type="button" className="text-destructive underline underline-offset-4" onClick={() => void flush()}>
                บันทึกไม่สำเร็จ ลองใหม่
              </button>
            ) : saveState === "saved" ? (
              "บันทึกแล้ว"
            ) : locked ? (
              STATUS_TEXT[cur.status]
            ) : (
              "บันทึกอัตโนมัติ"
            )}
          </p>
          <Button type="button" variant="outline" className="h-11" onClick={() => window.print()}>
            <Printer className="size-4" />
            <span className="hidden sm:inline">พิมพ์</span>
            <span className="sr-only sm:hidden">พิมพ์</span>
          </Button>
          {!readOnly && cur.status === "review" && (
            <Button type="button" variant="outline" className="h-11" disabled={busy} onClick={() => void withdraw()}>
              <RotateCcw className="size-4" />
              ถอนกลับมาแก้
            </Button>
          )}
          {!readOnly && (cur.status === "empty" || cur.status === "filling" || cur.status === "returned") && (
            <Button type="button" className="h-11" disabled={busy} onClick={() => void submit()}>
              <Send className="size-4" />
              {busy ? "กำลังส่ง…" : "ส่งตรวจ"}
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ล้างข้อมูลตัวอย่างไหม?</AlertDialogTitle>
            <AlertDialogDescription>
              จะล้างเฉพาะหัวข้อที่ยังเป็นข้อมูลตัวอย่าง หัวข้อที่คุณแก้ไขแล้วจะไม่ถูกลบ
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clearSample}>
              ล้างข้อมูลตัวอย่าง
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
