"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Printer, RotateCcw, Send, Sparkles, Trash2 } from "lucide-react";
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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { SECTIONS, SECTION_BY_ID, type Section } from "@/lib/form-schema";
import { asRows, isFilled, normalizeSection, type SectionData } from "@/lib/form-logic";
import { weightGroups } from "@/lib/kpi";
import { asStatus, STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";
import { SAMPLE_SECTIONS } from "@/lib/sample-data";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";
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
  const [navOpen, setNavOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

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
      setNavOpen(false);
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

  const navList = (
    <ul className="space-y-1">
      {SECTIONS.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => go(s.id)}
            aria-current={s.id === current.id ? "true" : undefined}
            className={cn(
              "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent",
              s.id === current.id && "bg-accent font-medium",
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground tabular-nums">
              {String(s.no).padStart(2, "0")}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm">{s.th}</span>
              <span className="block truncate text-xs text-muted-foreground">{s.en}</span>
            </span>
            <StatusPill status={statuses[i]} />
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:gap-8 print:block">
      <aside className="hidden lg:block print:hidden">
        <nav aria-label="หัวข้อทั้ง 13" className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
          {navList}
        </nav>
      </aside>

      <div className="min-w-0 space-y-5 pb-20">
        <div className="space-y-3 print:hidden">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="text-sm text-muted-foreground">
              {readOnly ? "ผู้ตรวจดูได้อย่างเดียว" : "AI-ANNA Business Blueprint 13 หัวข้อ ข้อมูลบันทึกอัตโนมัติ"}
            </p>
          </div>
          <Card className="p-4">
            <PlanProgress statuses={statuses} total={SECTIONS.length} />
          </Card>

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

          <div className="lg:hidden">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger
                render={<Button type="button" variant="outline" className="h-12 w-full justify-between px-3 text-base" />}
              >
                <span className="truncate">
                  หัวข้อ {current.no}/{SECTIONS.length} · {current.th}
                </span>
                <ChevronDown className="size-5" />
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>เลือกหัวข้อ</SheetTitle>
                  <SheetDescription>แผนมี 13 หัวข้อ กดเพื่อไปที่หัวข้อนั้น</SheetDescription>
                </SheetHeader>
                <div className="px-4 pb-6">{navList}</div>
              </SheetContent>
            </Sheet>
          </div>
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

          <SectionBody
            section={current}
            data={cur.data}
            disabled={locked}
            onChange={(d) => edit(current.id, d)}
            onMessage={(text) => setMessage({ text, kind: "err" })}
          />

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
