"use client";

import { useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SectionData } from "@/lib/form-logic";
import { SECTION_BY_ID } from "@/lib/form-schema";
import { buildXlsx, type ExportItem } from "@/lib/export-xlsx";
import type { SectionStatus } from "@/lib/plan-status";
import { buildPdf } from "./report-pdf";
import { renderSectionImage } from "./report-images";

type Item = { id: string; data: SectionData; status: SectionStatus };

const fileName = (company: string, ext: string) =>
  `Anna_AI_Report${company.trim() ? "_" + company.trim().replace(/[\\/:*?"<>|\s]+/g, "_") : ""}.${ext}`;

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

/** ปุ่มเลือกรูปแบบรีพอร์ต: PDF (ไฟล์ A4 จัดหน้าเป็นเทมเพลต) หรือ Excel (ข้อมูลแยกชีตตามหัวข้อ) */
export function ReportActions({
  items,
  company,
  dateText,
  md,
  json,
}: {
  items: Item[];
  company: string;
  dateText: string;
  md: string;
  json: string;
}) {
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function renderImages() {
    const byId = new Map(items.map((i) => [i.id, i]));
    const [fishbone, bmc, org] = await Promise.all(
      (["fishbone", "bmc", "org"] as const).map((k) =>
        renderSectionImage(k, byId.get(k)?.data ?? {}, company),
      ),
    );
    return { fishbone, bmc, org };
  }
  const exportItems = (): ExportItem[] =>
    items.map((i) => ({
      section: SECTION_BY_ID[i.id],
      data: i.data,
      status: i.status,
    }));

  async function pdf() {
    setBusy("pdf");
    setError(null);
    setStatus("กำลังเตรียมรูปประกอบ…");
    try {
      const images = await renderImages();
      const blob = await buildPdf(
        exportItems(),
        company,
        dateText,
        images,
        (done, total, label) =>
          setStatus(
            total > 1
              ? `${label} (${Math.round((done / total) * 100)}%)`
              : label,
          ),
      );
      save(blob, fileName(company, "pdf"));
      setStatus("ดาวน์โหลดไฟล์ PDF แล้ว");
    } catch {
      setStatus(null);
      setError("สร้างไฟล์ PDF ไม่สำเร็จ ลองกดอีกครั้ง");
    }
    setBusy(null);
  }

  async function copy() {
    setError(null);
    try {
      await navigator.clipboard.writeText(md);
      setStatus("คัดลอกแล้ว");
    } catch {
      setStatus(null);
      setError("คัดลอกไม่สำเร็จ ลองเลือกข้อความในกล่องด้านล่างแล้วกด Ctrl+C / ⌘C");
    }
  }

  function saveText(text: string, ext: "md" | "json", type: string) {
    setError(null);
    const name = fileName(company, ext).replace("Anna_AI_Report", "Business_Plan");
    save(new Blob([text], { type }), name);
    setStatus(`บันทึก ${name} แล้ว`);
  }

  async function xlsx() {
    setBusy("xlsx");
    setError(null);
    setStatus("กำลังสร้างไฟล์ Excel…");
    try {
      const blob = await buildXlsx(
        exportItems(),
        company,
        dateText,
        await renderImages(),
      );
      save(blob, fileName(company, "xlsx"));
      setStatus("ดาวน์โหลดไฟล์ Excel แล้ว");
    } catch {
      setStatus(null);
      setError("สร้างไฟล์ Excel ไม่สำเร็จ ลองกดอีกครั้ง");
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <Button type="button" className="h-11 bg-gold font-semibold text-gold-foreground hover:bg-gold/90 md:h-10" onClick={() => void copy()}>
        คัดลอกข้อความ
      </Button>
      <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => saveText(md, "md", "text/markdown;charset=utf-8")}>
        ดาวน์โหลด .md
      </Button>
      <Button type="button" variant="outline" className="h-11 md:h-10" onClick={() => saveText(json, "json", "application/json;charset=utf-8")}>
        ดาวน์โหลด .json
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-10"
        disabled={busy !== null}
        onClick={() => void pdf()}
      >
        <FileText className="size-4" />
        {busy === "pdf" ? "กำลังสร้าง PDF…" : "ดาวน์โหลด PDF"}
      </Button>
      <Button
        type="button"
        variant="outline"
        className="h-11 md:h-10"
        disabled={busy !== null}
        onClick={() => void xlsx()}
      >
        <FileSpreadsheet className="size-4" />
        {busy === "xlsx" ? "กำลังสร้างไฟล์…" : "ดาวน์โหลด Excel"}
      </Button>
      {status && !error && (
        <p className="basis-full text-sm text-muted-foreground" role="status">
          {status}
        </p>
      )}
      {error && (
        <p className="basis-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
