"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { SectionData } from "@/lib/form-logic";
import { SECTIONS, SECTION_BY_ID } from "@/lib/form-schema";
import type { SectionStatus } from "@/lib/plan-status";
import { buildSectionPdf, SECTION_PDF_NAME, type SectionPdfKind } from "./report-section-pdf";

type Item = { id: string; data: SectionData; status: SectionStatus };

const LABEL: Record<SectionPdfKind, string> = { roles: "Key Role", kpis: "KPI", competency: "Competency" };
const EMPTY: Record<SectionPdfKind, string> = {
  roles: "ยังไม่มีข้อมูลหัวข้อ Key Role",
  kpis: "ยังไม่มีข้อมูลหัวข้อ KPI",
  competency: "ยังไม่ได้เลือกสมรรถนะในหัวข้อ Key Competency",
};

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** PDF แยกรายหัวข้อ: Key Role, KPI, Competency */
export function SectionPdfActions({ items, company }: { items: Item[]; company: string }) {
  const [busy, setBusy] = useState<SectionPdfKind | null>(null);

  async function run(kind: SectionPdfKind) {
    const it = items.find((i) => i.id === kind);
    if (!it) return;
    setBusy(kind);
    const id = "section-pdf";
    toast.loading("กำลังเตรียมไฟล์…", { id });
    try {
      const blob = await buildSectionPdf(kind, { section: SECTION_BY_ID[kind], data: it.data, status: it.status }, company, SECTIONS.length, (done, total, label) =>
        toast.loading(total > 1 ? `${label} (${Math.round((done / total) * 100)}%)` : label, { id }),
      );
      const co = company.trim().replace(/[\\/:*?"<>|\s]+/g, "_");
      save(blob, `${SECTION_PDF_NAME[kind]}${co ? "_" + co : ""}.pdf`);
      toast.success("ดาวน์โหลดแล้ว", { id });
    } catch (e) {
      if (e instanceof Error && e.message === "empty") toast.error(EMPTY[kind], { id });
      else toast.error("สร้างไฟล์ PDF ไม่สำเร็จ ลองกดอีกครั้ง", { id });
    }
    setBusy(null);
  }

  return (
    <div className="space-y-3 rounded-[10px] border p-4 print:hidden">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">PDF แยกรายหัวข้อ</h2>
        <p className="text-sm text-muted-foreground">รายงานเฉพาะหัวข้อ 10, 11 และ 12 หน้าตาตามไฟล์ตัวอย่าง Output AI-ANNA</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {(["roles", "kpis", "competency"] as const).map((k) => (
          <Button key={k} type="button" variant="outline" className="h-11 md:h-10" disabled={busy !== null} onClick={() => void run(k)}>
            <FileText className="size-4" />
            {busy === k ? "กำลังสร้าง…" : LABEL[k]}
          </Button>
        ))}
      </div>
    </div>
  );
}
