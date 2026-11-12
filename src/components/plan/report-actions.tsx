"use client";

import { useState } from "react";
import { FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionData } from "@/lib/form-logic";
import { SECTION_BY_ID } from "@/lib/form-schema";
import { buildXlsx, type ExportItem } from "@/lib/export-xlsx";
import type { SectionStatus } from "@/lib/plan-status";
import { renderSectionImage } from "./report-images";

type Item = { id: string; data: SectionData; status: SectionStatus };

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** ปุ่มเลือกรูปแบบรีพอร์ต: PDF (ผ่านหน้าต่างพิมพ์ของเบราว์เซอร์) หรือ Excel */
export function ReportActions({ items, company, dateText }: { items: Item[]; company: string; dateText: string }) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pdf() {
    setBusy("pdf");
    // รอให้รูปทุกใบในรีพอร์ตวาดเสร็จก่อนเปิดหน้าต่างพิมพ์
    for (let i = 0; i < 40 && document.querySelector('[data-report-img="loading"]'); i++) await wait(250);
    setBusy(null);
    window.print();
  }

  async function xlsx() {
    setBusy("xlsx");
    setError(null);
    try {
      const byId = new Map(items.map((i) => [i.id, i]));
      const exportItems: ExportItem[] = items.map((i) => ({ section: SECTION_BY_ID[i.id], data: i.data, status: i.status }));
      const [fishbone, bmc, org] = await Promise.all(
        (["fishbone", "bmc", "org"] as const).map((k) => renderSectionImage(k, byId.get(k)?.data ?? {}, company)),
      );
      const blob = await buildXlsx(exportItems, company, dateText, { fishbone, bmc, org });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Anna_AI_Report${company.trim() ? "_" + company.trim().replace(/[\\/:*?"<>|\s]+/g, "_") : ""}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch {
      setError("สร้างไฟล์ Excel ไม่สำเร็จ ลองกดอีกครั้ง");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" className="h-11 md:h-9" disabled={busy !== null} onClick={() => void pdf()}>
        <Printer className="size-4" />
        {busy === "pdf" ? "กำลังเตรียม…" : "ดาวน์โหลด PDF"}
      </Button>
      <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy !== null} onClick={() => void xlsx()}>
        <FileSpreadsheet className="size-4" />
        {busy === "xlsx" ? "กำลังสร้างไฟล์…" : "ดาวน์โหลด Excel"}
      </Button>
      {error && (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
