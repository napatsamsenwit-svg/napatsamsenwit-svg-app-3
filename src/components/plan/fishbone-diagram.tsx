"use client";

import { useState } from "react";
import { Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { asRows, asText, isFilled, type SectionData } from "@/lib/form-logic";

/* พอร์ตจากต้นฉบับ (fishboneSVG): สีและรูปทรงเดิม ข้อความภาษาไทยตัดคำด้วย Intl.Segmenter */
const C = {
  bg: "#F7F8FC",
  ink: "#1C244B",
  muted: "#5A6285",
  bone: "#1C244B",
  gold: "#1F3668",
  head: "#FBF5C8",
  label: "#F2DE32",
  labelInk: "#1C244B",
  box: "#FFFFFF",
  line: "#D9DCE8",
  title: "#1F3668",
};

/** ฟอนต์สำรองของระบบ ใช้ตอนส่งออกรูป (รูป SVG ที่โหลดเป็นภาพใช้ฟอนต์ของหน้าเว็บไม่ได้) */
const EXPORT_FONT = "'Noto Sans Thai', 'Thonburi', Tahoma, sans-serif";

const xe = (s: string) =>
  String(s).replace(
    /[&<>"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
const headOf = (t: string) => {
  const i = t.search(/[:：]/);
  return i > 0 ? t.slice(0, i).trim() : t.trim();
};

type Built = { w: number; h: number; svg: string };

function buildSvg(
  d: SectionData,
  detail: boolean,
  font: string,
  rounded: boolean,
): Built {
  const ctx = document
    .createElement("canvas")
    .getContext("2d") as CanvasRenderingContext2D;
  const seg =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? new Intl.Segmenter("th", { granularity: "word" })
      : null;
  const fC = `400 13px ${font}`;
  const fL = `600 14px ${font}`;
  const fH = `600 15px ${font}`;

  const wrap = (text: string, max: number, f: string) => {
    ctx.font = f;
    const W = (t: string) => ctx.measureText(t).width;
    const words = seg
      ? Array.from(seg.segment(text), (x) => x.segment)
      : text.split(/(\s+)/);
    const lines: string[] = [];
    let cur = "";
    for (let w of words) {
      if (W(cur + w) <= max) {
        cur += w;
        continue;
      }
      if (cur.trim()) {
        lines.push(cur.trim());
        cur = "";
      }
      w = w.replace(/^\s+/, "");
      if (W(w) <= max) {
        cur = w;
        continue;
      }
      let chunk = "";
      for (const ch of Array.from(w)) {
        if (chunk && W(chunk + ch) > max) {
          lines.push(chunk);
          chunk = ch;
        } else chunk += ch;
      }
      cur = chunk;
    }
    if (cur.trim()) lines.push(cur.trim());
    return lines.length ? lines : [""];
  };

  const colW = detail ? 400 : 310;
  const slant = 46;
  const textMax = colW - 34 - slant - 16;
  const LH = 18;
  const GAP = 10;
  const LABH = 32;
  const cats = asRows(d.cats)
    .filter((c) => (c.name ?? "").trim() || (c.causes ?? "").trim())
    .map((c, ci) => {
      const items = (c.causes ?? "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((t) => wrap(detail ? t : headOf(t), textMax, fC));
      const h = items.reduce((a, l) => a + l.length * LH + GAP, 0) || LH + GAP;
      return { label: (c.name ?? "").trim() || `หมวดที่ ${ci + 1}`, items, h };
    });
  // แบ่งหมวดครึ่งบนครึ่งล่างของกระดูกสันหลัง จำนวนหมวดเป็นเท่าไรก็ได้
  const nTop = Math.max(1, Math.ceil(cats.length / 2));
  const nCols = nTop;
  const topCats = cats.slice(0, nTop);
  const botCats = cats.slice(nTop);
  const topH = Math.max(0, ...topCats.map((c) => c.h)) + LABH + 34;
  const botH = botCats.length
    ? Math.max(...botCats.map((c) => c.h)) + LABH + 34
    : 0;
  const headW = 250;
  const problem = asText(d.problem).trim();
  const headLines = wrap(problem || "ยังไม่ได้ระบุปัญหาหลัก", headW - 40, fH);
  const headH = Math.max(84, headLines.length * 21 + 36);
  const pad = 24;
  const x0 = pad + 34;
  const spineY = pad + Math.max(topH, headH / 2);
  let H = spineY + Math.max(botH, headH / 2) + pad;
  const headX = x0 + nCols * colW;
  const W = headX + headW + pad;
  const o: string[] = [];
  o.push(
    `<path d="M${pad} ${spineY - 30} L${x0 + 8} ${spineY} L${pad} ${spineY + 30} Z" fill="${C.gold}"/>`,
  );
  o.push(
    `<line x1="${x0}" y1="${spineY}" x2="${headX}" y2="${spineY}" stroke="${C.bone}" stroke-width="4" stroke-linecap="round"/>`,
  );
  const hy = spineY - headH / 2;
  o.push(
    `<rect x="${headX}" y="${hy}" width="${headW}" height="${headH}" rx="${Math.min(42, headH / 2)}" fill="${C.head}" stroke="${C.gold}" stroke-width="2"/>`,
  );
  const hty = spineY - ((headLines.length - 1) * 21) / 2 + 5;
  o.push(
    `<text x="${headX + headW / 2 - 6}" y="${hty}" text-anchor="middle" font-size="15" font-weight="600" fill="${C.ink}">${headLines
      .map(
        (l, i) =>
          `<tspan x="${headX + headW / 2 - 6}" dy="${i ? 21 : 0}">${xe(l)}</tspan>`,
      )
      .join("")}</text>`,
  );
  o.push(
    `<circle cx="${headX + headW - 22}" cy="${hy + 18}" r="4" fill="${C.bone}"/>`,
  );

  cats.forEach((c, i) => {
    const top = i < nTop;
    const j = top ? i : i - nTop;
    const bx = x0 + (j + 1) * colW - 24;
    const yEnd = top ? spineY - topH + LABH + 6 : spineY + botH - LABH - 6;
    const xFar = bx - slant;
    const boneAt = (y: number) =>
      xFar + (bx - xFar) * ((y - yEnd) / (spineY - yEnd));
    o.push(
      `<line x1="${xFar}" y1="${yEnd}" x2="${bx}" y2="${spineY}" stroke="${C.bone}" stroke-width="2.5" stroke-linecap="round"/>`,
    );
    ctx.font = fL;
    const lw = ctx.measureText(c.label).width + 28;
    const ly = top ? yEnd - LABH : yEnd;
    o.push(
      `<rect x="${xFar - lw / 2}" y="${ly}" width="${lw}" height="${LABH}" rx="8" fill="${C.label}"/>`,
    );
    o.push(
      `<text x="${xFar}" y="${ly + LABH / 2 + 5}" text-anchor="middle" font-size="14" font-weight="600" fill="${C.labelInk}">${xe(c.label)}</text>`,
    );
    let y = top ? yEnd + 22 : spineY + 24;
    if (!c.items.length) {
      o.push(
        `<text x="${boneAt(y) - 16}" y="${y}" text-anchor="end" font-size="13" fill="${C.muted}">—</text>`,
      );
      return;
    }
    c.items.forEach((lines) => {
      const bxy = boneAt(y - 4);
      o.push(
        `<line x1="${bxy - 12}" y1="${y - 4}" x2="${bxy}" y2="${y - 4}" stroke="${C.gold}" stroke-width="2"/>`,
      );
      lines.forEach((l, k) => {
        const ly2 = y + k * LH;
        o.push(
          `<text x="${boneAt(ly2 - 4) - 16}" y="${ly2}" text-anchor="end" font-size="13" fill="${C.ink}">${xe(l)}</text>`,
        );
      });
      y += lines.length * LH + GAP;
    });
  });

  if (detail) {
    const bw = W - 2 * pad;
    const tw = bw - 32;
    const block = (title: string, text: string) => {
      const ls: string[] = [];
      text
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean)
        .forEach((p) => wrap(p, tw, fC).forEach((l) => ls.push(l)));
      return { title, ls: ls.length ? ls : ["—"] };
    };
    const blocks = [
      block("สาเหตุหลัก (Root Cause)", asText(d.root)),
      block("แนวทางแก้ไข", asText(d.solution)),
    ];
    const bh = blocks.reduce((a, b) => a + 28 + b.ls.length * LH + 10, 0) + 16;
    const by = H;
    o.push(
      `<rect x="${pad}" y="${by}" width="${bw}" height="${bh}" rx="10" fill="${C.box}" stroke="${C.line}"/>`,
    );
    let yy = by + 28;
    blocks.forEach((b) => {
      o.push(
        `<text x="${pad + 16}" y="${yy}" font-size="14" font-weight="600" fill="${C.title}">${xe(b.title)}</text>`,
      );
      yy += 22;
      b.ls.forEach((l) => {
        o.push(
          `<text x="${pad + 16}" y="${yy}" font-size="13" fill="${C.ink}">${xe(l)}</text>`,
        );
        yy += LH;
      });
      yy += 16;
    });
    H = by + bh + pad;
  }

  return {
    w: W,
    h: H,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="${xe(font)}" role="img" aria-label="แผนผังก้างปลา: ${xe(problem)}"><rect width="${W}" height="${H}" fill="${C.bg}" rx="${rounded ? 12 : 0}"/>${o.join("")}</svg>`,
  };
}

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** รูปแผนผังก้างปลา: สร้างได้ทุกเมื่อที่มีข้อมูล (ไม่ต้องรอส่งตรวจ) ดาวน์โหลดเป็น PNG หรือ SVG */
export function FishboneDiagram({
  section,
  data,
}: {
  section: Parameters<typeof isFilled>[0];
  data: SectionData;
}) {
  const [detail, setDetail] = useState(false);
  const [svg, setSvg] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    kind: "ok" | "err";
  } | null>(null);
  const [busy, setBusy] = useState(false);

  async function draw(nextDetail = detail) {
    if (!isFilled(section, data)) {
      setMessage({ text: "ยังไม่มีข้อมูล กรอกปัญหาและสาเหตุก่อน", kind: "err" });
      return;
    }
    try {
      await document.fonts.ready;
    } catch {
      /* ใช้ฟอนต์ที่มีอยู่ */
    }
    const page = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-anuphan")
      .trim();
    const font = `${page ? page + ", " : ""}${EXPORT_FONT}`;
    setSvg(buildSvg(data, nextDetail, font, true).svg);
    setMessage({
      text: nextDetail ? "แสดงสาเหตุพร้อมรายละเอียด" : "แสดงเฉพาะหัวข้อของสาเหตุ",
      kind: "ok",
    });
  }

  async function downloadPng() {
    setBusy(true);
    setMessage({ text: "กำลังสร้างภาพ PNG…", kind: "ok" });
    try {
      const { svg: s, w, h } = buildSvg(data, detail, EXPORT_FONT, false);
      const img = new Image();
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s);
      await img.decode();
      const sc = 2;
      const cv = document.createElement("canvas");
      cv.width = w * sc;
      cv.height = h * sc;
      const cx = cv.getContext("2d") as CanvasRenderingContext2D;
      cx.fillStyle = C.bg;
      cx.fillRect(0, 0, cv.width, cv.height);
      cx.scale(sc, sc);
      cx.drawImage(img, 0, 0, w, h);
      const blob = await new Promise<Blob>((res, rej) =>
        cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"),
      );
      save(`Fishbone_${detail ? "detail" : "headings"}.png`, blob);
      setMessage({ text: "ดาวน์โหลดภาพ PNG แล้ว", kind: "ok" });
    } catch {
      setMessage({
        text: "สร้างภาพ PNG ไม่สำเร็จ ลองดาวน์โหลดเป็น SVG แทน",
        kind: "err",
      });
    }
    setBusy(false);
  }

  function downloadSvg() {
    const { svg: s } = buildSvg(data, detail, EXPORT_FONT, false);
    save(
      `Fishbone_${detail ? "detail" : "headings"}.svg`,
      new Blob([s], { type: "image/svg+xml" }),
    );
  }

  return (
    <Card className="space-y-3 p-4 print:hidden">
      <div>
        <h3 className="text-lg font-medium">รูปแผนผังก้างปลา</h3>
        <p className="text-sm text-muted-foreground">
          สร้างรูปจากข้อมูลที่กรอกไว้ได้ทุกเมื่อ ไม่ต้องรอส่งตรวจ
          ดาวน์โหลดเป็นภาพไปใส่เอกสารหรือสไลด์ได้
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="button"
          className="h-11 md:h-9"
          onClick={() => void draw()}
        >
          <ImageIcon className="size-4" />
          สร้างแผนผังก้างปลา
        </Button>
        <div className="flex min-h-11 items-center gap-2">
          <Checkbox
            id="fb-detail"
            checked={detail}
            onCheckedChange={(v) => {
              const next = v === true;
              setDetail(next);
              if (svg) void draw(next);
            }}
          />
          <Label htmlFor="fb-detail">แสดงรายละเอียดทั้งหมด</Label>
        </div>
        {svg && (
          <>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              disabled={busy}
              onClick={() => void downloadPng()}
            >
              <Download className="size-4" />
              ดาวน์โหลด PNG
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 md:h-9"
              onClick={downloadSvg}
            >
              <Download className="size-4" />
              ดาวน์โหลด SVG
            </Button>
          </>
        )}
      </div>
      {message && (
        <p
          className={
            message.kind === "err"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {message.text}
        </p>
      )}
      {svg ? (
        <div
          className="overflow-x-auto rounded-xl border"
          tabIndex={0}
          aria-label="แผนผังก้างปลา เลื่อนดูด้านข้างได้"
        >
          <div dangerouslySetInnerHTML={{ __html: svg }} className="w-max" />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
          กด &quot;สร้างแผนผังก้างปลา&quot; เพื่อดูรูป
        </p>
      )}
    </Card>
  );
}
