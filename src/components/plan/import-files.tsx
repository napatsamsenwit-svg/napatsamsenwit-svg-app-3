"use client";

import { useState } from "react";
import { FileSpreadsheet, FolderArchive } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Row } from "@/lib/form-logic";
import { asRows } from "@/lib/form-logic";
import { buildCompetencyXlsx, buildImportZip, buildKeyRoleXlsx, buildKpiFiles } from "@/lib/export-import";

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

type Kind = "roles" | "kpis" | "competency" | "all";

/** ไฟล์ Excel สำหรับนำเข้าระบบประเมิน (Key Role / KPI / Competency) */
export function ImportFiles({ roles, kpis, competency }: { roles: Row[]; kpis: Row[]; competency: Row[] }) {
  const [busy, setBusy] = useState<Kind | null>(null);

  async function run(kind: Kind) {
    setBusy(kind);
    try {
      if (kind === "roles") {
        if (!asRows(roles).length) return void toast.error("ยังไม่มีข้อมูลหัวข้อ Key Role");
        save(await buildKeyRoleXlsx(roles), "1.2 Input Key Role.xlsx");
      } else if (kind === "kpis") {
        const files = await buildKpiFiles(kpis);
        if (!files.length) return void toast.error("ยังไม่มีข้อมูลหัวข้อ KPI");
        if (files.length === 1) save(files[0].blob, files[0].name);
        else {
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          files.forEach((f) => zip.file(f.name, f.blob));
          save(await zip.generateAsync({ type: "blob" }), "2.2 Input KPI.zip");
        }
      } else if (kind === "competency") {
        if (!asRows(competency).some((r) => (r.name ?? "").trim())) return void toast.error("ยังไม่ได้เลือกสมรรถนะในหัวข้อ Key Competency");
        save(await buildCompetencyXlsx(competency), "3.2 Input Competency.xlsx");
      } else {
        save(await buildImportZip({ roles, kpis, competency }), "Output AI-ANNA.zip");
      }
      toast.success("ดาวน์โหลดแล้ว");
    } catch {
      toast.error("สร้างไฟล์ไม่สำเร็จ ลองกดอีกครั้ง");
    }
    setBusy(null);
  }

  const btn = (kind: Kind, label: string, icon: React.ReactNode) => (
    <Button type="button" variant="outline" className="h-11 md:h-10" disabled={busy !== null} onClick={() => void run(kind)}>
      {icon}
      {busy === kind ? "กำลังสร้าง…" : label}
    </Button>
  );

  return (
    <div className="space-y-3 rounded-[10px] border p-4 print:hidden">
      <div className="space-y-1">
        <h2 className="text-base font-semibold">ไฟล์ Excel สำหรับนำเข้าระบบประเมิน</h2>
        <p className="text-sm text-muted-foreground">โครงคอลัมน์ตรงกับไฟล์ตัวอย่าง Output AI-ANNA ใช้ข้อมูลที่กรอกไว้ในหัวข้อ 10, 11 และ 12</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {btn("roles", "Key Role", <FileSpreadsheet className="size-4" />)}
        {btn("kpis", "KPI (แยกตามฝ่าย)", <FileSpreadsheet className="size-4" />)}
        {btn("competency", "Competency", <FileSpreadsheet className="size-4" />)}
        {btn("all", "ดาวน์โหลดทั้งชุด (zip)", <FolderArchive className="size-4" />)}
      </div>
    </div>
  );
}
