"use client";

import { useEffect, useState } from "react";
import type { SectionData } from "@/lib/form-logic";
import { isFilled } from "@/lib/form-logic";
import { SECTION_BY_ID } from "@/lib/form-schema";
import { bmcCanvas, orgCanvas } from "./canvas-exports";
import { buildSvg, EXPORT_FONT } from "./fishbone-diagram";

export type ImageKind = "fishbone" | "bmc" | "org";

export const IMAGE_TITLE: Record<ImageKind, string> = {
  fishbone: "แผนผังก้างปลา",
  bmc: "Business Model Canvas",
  org: "โครงสร้างองค์กร",
};

/** วาดรูปของหัวข้อเป็น PNG (data URL) ใช้แปะในรีพอร์ตและแนบใน Excel */
export async function renderSectionImage(kind: ImageKind, data: SectionData, company: string): Promise<string | null> {
  if (!isFilled(SECTION_BY_ID[kind], data)) return null;
  try {
    if (kind === "bmc") return (await bmcCanvas(data, company)).cv.toDataURL("image/png");
    if (kind === "org") return (await orgCanvas(data, company))?.cv.toDataURL("image/png") ?? null;
    try {
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ที่มีอยู่ */
    }
    const { svg, w, h } = buildSvg(data, false, EXPORT_FONT, false);
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const sc = 2;
    const cv = document.createElement("canvas");
    cv.width = w * sc;
    cv.height = h * sc;
    const cx = cv.getContext("2d") as CanvasRenderingContext2D;
    cx.fillStyle = "#F7F8FC";
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.scale(sc, sc);
    cx.drawImage(img, 0, 0, w, h);
    return cv.toDataURL("image/png");
  } catch {
    return null;
  }
}

/** รูปที่แปะในรีพอร์ต: สร้างเองอัตโนมัติจากข้อมูลของหัวข้อ */
export function ReportImage({ kind, data, company }: { kind: ImageKind; data: SectionData; company: string }) {
  const [state, setState] = useState<{ url: string | null; done: boolean }>({ url: null, done: false });

  useEffect(() => {
    let alive = true;
    void renderSectionImage(kind, data, company).then((url) => {
      if (alive) setState({ url, done: true });
    });
    return () => {
      alive = false;
    };
  }, [kind, data, company]);

  if (state.done && !state.url) return null;
  return (
    <figure className="space-y-1 print:break-inside-avoid" data-report-img={state.done ? "done" : "loading"}>
      <figcaption className="text-sm font-medium text-muted-foreground">ภาพประกอบ: {IMAGE_TITLE[kind]}</figcaption>
      {state.url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={state.url} alt={IMAGE_TITLE[kind]} className="h-auto w-full rounded-lg border" />
      ) : (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">กำลังสร้างภาพ…</p>
      )}
    </figure>
  );
}
