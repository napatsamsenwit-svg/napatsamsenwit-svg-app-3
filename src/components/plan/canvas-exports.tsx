"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SECTION_BY_ID } from "@/lib/form-schema";
import { asRows, asText, isFilled, type Row, type SectionData } from "@/lib/form-logic";

/* พอร์ตจากต้นฉบับ (bmcCanvas / orgCanvas): วาดลง canvas แล้วดาวน์โหลดเป็น PNG */

type Ctx = CanvasRenderingContext2D;
type Msg = { text: string; kind: "ok" | "err" } | null;

const FALLBACK = "'Noto Sans Thai', 'Thonburi', Tahoma, sans-serif";

function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/** ฟอนต์ของหน้าเว็บ (Anuphan / Poppins) พร้อมฟอนต์สำรอง และโหลดให้พร้อมก่อนวาด */
export async function loadFonts(weights: string[]) {
  const th = `${cssVar("--font-anuphan") ? cssVar("--font-anuphan") + ", " : ""}${FALLBACK}`;
  const en = `${cssVar("--font-poppins") ? cssVar("--font-poppins") + ", " : ""}${th}`;
  try {
    await Promise.all(weights.flatMap((w) => [document.fonts.load(`${w} 30px ${th}`, "กขA"), document.fonts.load(`${w} 30px ${en}`, "กขA")]));
  } catch {
    /* ใช้ฟอนต์ที่มีอยู่ */
  }
  return { th, en };
}

const SEG = typeof Intl !== "undefined" && "Segmenter" in Intl ? new Intl.Segmenter("th", { granularity: "word" }) : null;

function wrapText(cx: Ctx, text: string, maxW: number): string[] {
  const raw = SEG ? [...SEG.segment(text)].map((x) => x.segment) : text.split(/(\s+)/);
  const parts = raw.reduce<string[]>((a, p) => {
    if (a.length && /[(\[“"']$/.test(a[a.length - 1])) a[a.length - 1] += p;
    else if (a.length && /^[)\]”,.:;!?%]/.test(p)) a[a.length - 1] += p;
    else a.push(p);
    return a;
  }, []);
  const lines: string[] = [];
  let cur = "";
  for (const p of parts) {
    const t = cur + p;
    if (cx.measureText(t).width <= maxW || !cur.trim()) {
      if (cx.measureText(t).width > maxW && !cur.trim()) {
        let piece = "";
        for (const ch of p) {
          if (cx.measureText(piece + ch).width > maxW && piece) {
            lines.push(piece);
            piece = "";
          }
          piece += ch;
        }
        cur = piece;
        continue;
      }
      cur = t;
    } else {
      lines.push(cur.trimEnd());
      cur = p.trimStart();
    }
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
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

export const canvasToBlob = (cv: HTMLCanvasElement) =>
  new Promise<Blob>((res, rej) => cv.toBlob((b) => (b ? res(b) : rej(new Error("toBlob"))), "image/png"));

const fileSafe = (s: string) => s.trim().replace(/[\\/:*?"<>|\s]+/g, "_");

/* ---------------- Business Model Canvas ---------------- */

const BMC_C = { bg: "#1C244B", note: "#FAE98A", curl: "#E6D365", ink: "#1C244B", ink2: "#4A5275", head: "#FFFFFF", sub: "#C9CDE0" };
const BMC_W = 3840;
const BMC_H = 2716;
const BMC_M = 72;
const BMC_G = 36;
const BMC_TOP = BMC_M + 96;

type Fonts = { th: string; en: string };

const bmcItems = (v: unknown) =>
  asText(v)
    .split("\n")
    .map((x) => x.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, "").trim())
    .filter(Boolean);

const bmcM = (fs: number) => ({
  pad: Math.round(fs * 1.1),
  en: Math.max(36, Math.round(fs * 1.2)),
  th: Math.max(28, Math.round(fs * 0.9)),
  head: Math.round(fs * 1.1 + Math.max(36, fs * 1.2) + fs * 0.3 + Math.max(28, fs * 0.9) * 1.35 + fs * 0.55),
  foot: Math.round(fs * 1.5),
  lh: Math.round(fs * 1.38),
  gap: Math.round(fs * 0.4),
  bw: Math.round(fs * 0.95),
  cgap: Math.round(fs * 1.6),
});

const bmcCols = (k: string) => (k === "cost" || k === "rev" ? 2 : 1);

function bmcLayout(cx: Ctx, f: Fonts, items: string[], tw: number, fs: number, cols: number) {
  const m = bmcM(fs);
  cx.font = `400 ${fs}px ${f.th}`;
  const colW = cols === 2 ? (tw - m.cgap) / 2 : tw;
  const lines = items.map((it) => wrapText(cx, it, colW - m.bw));
  const hs = lines.map((l) => l.length * m.lh + m.gap);
  let split = lines.length;
  if (cols === 2 && lines.length > 1) {
    let best = 1e9;
    for (let k = 1; k < lines.length; k++) {
      const a = hs.slice(0, k).reduce((x, y) => x + y, 0);
      const b = hs.slice(k).reduce((x, y) => x + y, 0);
      const mx = Math.max(a, b);
      if (mx < best) {
        best = mx;
        split = k;
      }
    }
  }
  const parts = cols === 2 ? [lines.slice(0, split), lines.slice(split)] : [lines];
  const total = Math.max(...parts.map((p) => p.reduce((x, l) => x + l.length * m.lh + m.gap, 0))) - m.gap;
  return { parts, colW, total: Math.max(total, 0), m };
}

function drawNote(cx: Ctx, f: Fonts, data: SectionData, field: { k: string; label: string }, x: number, y: number, w: number, h: number, curlRight: boolean, fs: number) {
  const c = BMC_C;
  const m = bmcM(fs);
  const r = Math.min(fs * 3.2, h * 0.22);
  cx.fillStyle = c.note;
  cx.beginPath();
  if (curlRight) {
    cx.moveTo(x, y);
    cx.lineTo(x + w, y);
    cx.lineTo(x + w, y + h - r);
    cx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    cx.lineTo(x, y + h);
  } else {
    cx.moveTo(x, y);
    cx.lineTo(x + w, y);
    cx.lineTo(x + w, y + h);
    cx.lineTo(x + r, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  cx.closePath();
  cx.fill();
  cx.fillStyle = c.curl;
  cx.beginPath();
  if (curlRight) {
    cx.moveTo(x + w, y + h - r);
    cx.quadraticCurveTo(x + w - r * 0.15, y + h - r * 0.45, x + w - r * 0.62, y + h - r * 0.42);
    cx.quadraticCurveTo(x + w - r * 0.7, y + h - r * 0.15, x + w - r, y + h);
    cx.quadraticCurveTo(x + w, y + h, x + w, y + h - r);
  } else {
    cx.moveTo(x, y + h - r);
    cx.quadraticCurveTo(x + r * 0.15, y + h - r * 0.45, x + r * 0.62, y + h - r * 0.42);
    cx.quadraticCurveTo(x + r * 0.7, y + h - r * 0.15, x + r, y + h);
    cx.quadraticCurveTo(x, y + h, x, y + h - r);
  }
  cx.closePath();
  cx.fill();

  const [en, th] = field.label.split(" · ");
  cx.textAlign = "center";
  cx.textBaseline = "top";
  let ef = m.en;
  cx.font = `700 ${ef}px ${f.en}`;
  while (ef > 18 && cx.measureText(en.toUpperCase()).width > w - m.pad * 1.2) {
    ef--;
    cx.font = `700 ${ef}px ${f.en}`;
  }
  cx.fillStyle = c.ink;
  cx.fillText(en.toUpperCase(), x + w / 2, y + m.pad + (m.en - ef) / 2);
  cx.fillStyle = c.ink2;
  cx.font = `500 ${m.th}px ${f.th}`;
  cx.fillText(th || "", x + w / 2, y + m.pad + m.en + Math.round(fs * 0.3));
  cx.textAlign = "left";

  const top = y + m.head;
  const bottom = y + h - m.foot + m.gap;
  const tx = x + m.pad;
  const items = bmcItems(data[field.k]);
  if (!items.length) {
    cx.fillStyle = c.ink2;
    cx.font = `italic 400 ${fs}px ${f.th}`;
    cx.fillText("— ยังไม่มีข้อมูล —", tx, top);
    return true;
  }
  const lay = bmcLayout(cx, f, items, w - m.pad * 2, fs, bmcCols(field.k));
  cx.fillStyle = c.ink;
  cx.font = `400 ${fs}px ${f.th}`;
  lay.parts.forEach((part, ci) => {
    let yy = top;
    const colX = tx + ci * (lay.colW + m.cgap);
    part.forEach((ls) => {
      cx.fillText("•", colX, yy);
      ls.forEach((l) => {
        if (yy + m.lh <= bottom) cx.fillText(l, colX + m.bw, yy);
        yy += m.lh;
      });
      yy += m.gap;
    });
  });
  return top + lay.total <= bottom;
}

function bmcPlan(cx: Ctx, f: Fonts, data: SectionData, fs: number, equal?: boolean) {
  const W = BMC_W;
  const M = BMC_M;
  const G = BMC_G;
  const Wc = W - 2 * M - 4 * G;
  const hw = (W - 2 * M - G) / 2;
  const N: Record<string, number> = {};
  const need = (k: string, w: number) => {
    const m = bmcM(fs);
    const items = bmcItems(data[k]);
    return (N[k] = m.head + (items.length ? bmcLayout(cx, f, items, w - m.pad * 2, fs, bmcCols(k)).total : m.lh) + m.foot);
  };
  const colNeed = (i: number, w: number) =>
    i === 0 ? need("kp", w) : i === 1 ? need("ka", w) + need("kr", w) + G : i === 2 ? need("vp", w) : i === 3 ? need("cr", w) + need("ch", w) + G : need("cs", w);
  let ws = [1, 1, 1, 1, 1].map(() => Wc / 5);
  let needs = ws.map((w, i) => colNeed(i, w));
  for (let it = 0; !equal && it < 10; it++) {
    const mean = needs.reduce((a, b) => a + b, 0) / 5;
    ws = ws.map((w, i) => Math.max(Wc * 0.16, w * Math.pow(needs[i] / mean, 0.6)));
    const sum = ws.reduce((a, b) => a + b, 0);
    ws = ws.map((w) => (w * Wc) / sum);
    const nn = ws.map((w, i) => colNeed(i, w));
    if (Math.max(...nn) >= Math.max(...needs) - 1 && it > 2) {
      needs = nn;
      break;
    }
    needs = nn;
  }
  needs = ws.map((w, i) => colNeed(i, w));
  need("cost", hw);
  need("rev", hw);
  const upH = Math.max(...needs);
  const botH = Math.max(N.cost, N.rev);
  return { ws, hw, N, upH, botH, need: upH + G + botH };
}

export async function bmcCanvas(data: SectionData, company: string) {
  const f = await loadFonts(["400", "500", "700"]);
  const W = BMC_W;
  const H = BMC_H;
  const M = BMC_M;
  const G = BMC_G;
  const top = BMC_TOP;
  const cv = document.createElement("canvas");
  const cx = cv.getContext("2d") as Ctx;
  const c = BMC_C;
  const fields = SECTION_BY_ID.bmc.fields;
  const F = (k: string) => fields.find((x) => x.k === k) as { k: string; label: string };
  const avail = H - top - M;
  let lo = 14;
  let hi = 48;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (bmcPlan(cx, f, data, mid).need <= avail) lo = mid;
    else hi = mid - 1;
  }
  const fs = lo;
  let p = bmcPlan(cx, f, data, fs, true);
  if (p.need > avail) p = bmcPlan(cx, f, data, fs);
  let upH = p.upH;
  let botH = p.botH;
  const spare = Math.max(0, avail - p.need);
  upH += spare * 0.6;
  botH += spare * 0.4;
  if (upH < (avail - G) * 0.6) {
    const d = (avail - G) * 0.6 - upH;
    upH += d;
    botH -= d;
  }
  const stack = (a: string, b: string) => {
    const free = upH - G - p.N[a] - p.N[b];
    return [p.N[a] + free / 2, p.N[b] + free / 2];
  };
  const [kaH, krH] = stack("ka", "kr");
  const [crH, chH] = stack("cr", "ch");
  cv.width = W;
  cv.height = H;
  cx.fillStyle = c.bg;
  cx.fillRect(0, 0, W, H);
  cx.textBaseline = "top";
  cx.textAlign = "left";
  cx.fillStyle = c.head;
  cx.font = `700 56px ${f.en}`;
  cx.fillText("Business Model Canvas", M, M - 6);
  if (company) {
    cx.font = `500 42px ${f.th}`;
    cx.fillStyle = c.sub;
    cx.textAlign = "right";
    cx.fillText(company, W - M, M);
  }
  const xs = p.ws.map((w, i) => M + p.ws.slice(0, i).reduce((a, b) => a + b, 0) + i * G);
  const ws = p.ws;
  const botY = top + upH + G;
  const boxes: [string, number, number, number, number, boolean][] = [
    ["kp", xs[0], top, ws[0], upH, true],
    ["ka", xs[1], top, ws[1], kaH, true],
    ["kr", xs[1], top + kaH + G, ws[1], krH, false],
    ["vp", xs[2], top, ws[2], upH, true],
    ["cr", xs[3], top, ws[3], crH, false],
    ["ch", xs[3], top + crH + G, ws[3], chH, true],
    ["cs", xs[4], top, ws[4], upH, false],
    ["cost", M, botY, p.hw, botH, false],
    ["rev", M + p.hw + G, botY, p.hw, botH, true],
  ];
  const over: string[] = [];
  boxes.forEach(([k, x, y, w, h, cr]) => {
    if (!drawNote(cx, f, data, F(k), x, y, w, h, cr, fs)) over.push(F(k).label.split(" · ")[0]);
  });
  return { cv, over, W, H };
}

/* ---------------- Organization chart ---------------- */

const ORG_C = {
  bg: "#FFFFFF",
  title: "#111111",
  sub: "#6B7088",
  line: "#B8BCC8",
  lv: ["#1C244B", "#1F3668", "#2F5289", "#4A6FA5"],
  ink: "#FFFFFF",
  ink2: "#D7DCEC",
  ext: "#EEF0F6",
  extInk: "#1C244B",
};

type OrgNode = {
  r: Row;
  kids: OrgNode[];
  parent: OrgNode | null;
  ext?: boolean;
  label?: string;
  d: number;
  x: number;
  w: number;
  L?: { a: string[]; b: string[]; c: string };
};

const orgKey = (s: unknown) => String(s ?? "").toLowerCase().replace(/\s+/g, "");
const orgBase = (s: unknown) => orgKey(String(s ?? "").replace(/\([^)]*\)/g, ""));

function orgTree(data: SectionData): OrgNode[] {
  const rows: OrgNode[] = asRows(data.rows)
    .filter((r) => (r.unit ?? "").trim() || (r.head ?? "").trim())
    .map((r) => ({ r, kids: [], parent: null, d: 0, x: 0, w: 0 }));
  const find = (rep: string | undefined, self: OrgNode) => {
    const k = orgKey(rep);
    const b = orgBase(rep);
    if (!k) return null;
    return (
      rows.find((n) => n !== self && orgKey(n.r.head) === k) ||
      rows.find((n) => n !== self && b && orgBase(n.r.head) === b) ||
      rows.find((n) => n !== self && b && orgBase(n.r.head) && (orgBase(n.r.head).startsWith(b) || b.startsWith(orgBase(n.r.head)))) ||
      rows.find((n) => n !== self && (orgKey(n.r.unit) === k || (b && orgBase(n.r.unit) === b))) ||
      null
    );
  };
  rows.forEach((n) => {
    let p = find(n.r.reports, n);
    for (let q = p; q; q = q.parent) {
      if (q === n) {
        p = null;
        break;
      }
    }
    n.parent = p;
    if (p) p.kids.push(n);
  });
  const roots = rows.filter((n) => !n.parent);
  const groups: { rep: string; kids: OrgNode[] }[] = [];
  roots.forEach((n) => {
    const rep = (n.r.reports ?? "").trim();
    const g = rep ? groups.find((x) => orgKey(x.rep) === orgKey(rep)) : undefined;
    if (g) g.kids.push(n);
    else groups.push({ rep, kids: [n] });
  });
  return groups.flatMap<OrgNode>((g) =>
    g.rep ? [{ ext: true, label: g.rep, kids: g.kids, r: {}, parent: null, d: 0, x: 0, w: 0 }] : g.kids,
  );
}

export async function orgCanvas(data: SectionData, company: string) {
  const tree = orgTree(data);
  if (!tree.length) return null;
  const f = await loadFonts(["400", "600", "700", "800"]);
  const NW = 380;
  const GX = 44;
  const GY = 110;
  const PADX = 26;
  const c = ORG_C;
  const cx = document.createElement("canvas").getContext("2d") as Ctx;
  const lines = (n: OrgNode) => {
    if (n.L) return n.L;
    if (n.ext) {
      cx.font = `600 28px ${f.th}`;
      n.L = { a: wrapText(cx, n.label ?? "", NW - PADX * 2).slice(0, 3), b: [], c: "" };
      return n.L;
    }
    cx.font = `700 30px ${f.th}`;
    const a = wrapText(cx, (n.r.unit ?? "").trim() || "—", NW - PADX * 2).slice(0, 3);
    cx.font = `400 25px ${f.th}`;
    const head = (n.r.head ?? "").trim();
    const b = head ? wrapText(cx, head, NW - PADX * 2).slice(0, 3) : [];
    const hc = (n.r.headcount ?? "").trim();
    n.L = { a, b, c: hc ? hc + " คน" : "" };
    return n.L;
  };
  const nh = (n: OrgNode) => {
    const L = lines(n);
    return 40 + L.a.length * 40 + (L.b.length ? 8 + L.b.length * 34 : 0) + (L.c ? 10 + 32 : 0);
  };
  const depthH: number[] = [];
  const walk = (n: OrgNode, d: number) => {
    n.d = d;
    depthH[d] = Math.max(depthH[d] || 0, nh(n));
    n.kids.forEach((k) => walk(k, d + 1));
  };
  tree.forEach((n) => walk(n, 0));
  const width = (n: OrgNode): number =>
    (n.w = n.kids.length ? Math.max(NW, n.kids.map(width).reduce((a, b) => a + b, 0) + GX * (n.kids.length - 1)) : NW);
  const total = tree.map(width).reduce((a, b) => a + b, 0) + GX * (tree.length - 1);
  const ys: number[] = [];
  depthH.forEach((h, d) => (ys[d] = d ? ys[d - 1] + depthH[d - 1] + GY : 0));
  const place = (n: OrgNode, x: number) => {
    n.x = x + n.w / 2 - NW / 2;
    let xx = x;
    n.kids.forEach((k) => {
      place(k, xx);
      xx += k.w + GX;
    });
    if (n.kids.length) n.x = (n.kids[0].x + n.kids[n.kids.length - 1].x) / 2;
  };
  let xx = 0;
  tree.forEach((n) => {
    place(n, xx);
    xx += n.w + GX;
  });
  const M = 110;
  const TH = 250;
  const W = Math.max(1920, Math.ceil(total + 2 * M));
  const H = Math.ceil(TH + ys[ys.length - 1] + depthH[depthH.length - 1] + M);
  const off = (W - total) / 2;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d") as Ctx;
  g.fillStyle = c.bg;
  g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  g.textBaseline = "top";
  g.fillStyle = c.title;
  g.font = `800 84px ${f.en}`;
  g.fillText("ORGANIZATIONAL CHART", W / 2, 70);
  if (company) {
    g.fillStyle = c.sub;
    g.font = `500 32px ${f.th}`;
    g.fillText(company, W / 2, 172);
  }
  const all: OrgNode[] = [];
  const coll = (n: OrgNode) => {
    all.push(n);
    n.kids.forEach(coll);
  };
  tree.forEach(coll);
  g.strokeStyle = c.line;
  g.lineWidth = 4;
  g.fillStyle = c.line;
  all.forEach((n) => {
    if (!n.kids.length) return;
    const px = off + n.x + NW / 2;
    const py = TH + ys[n.d] + depthH[n.d];
    const my = py + GY / 2;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(px, my);
    g.stroke();
    const kxs = n.kids.map((k) => off + k.x + NW / 2);
    g.beginPath();
    g.moveTo(Math.min(px, ...kxs), my);
    g.lineTo(Math.max(px, ...kxs), my);
    g.stroke();
    n.kids.forEach((k) => {
      const kx = off + k.x + NW / 2;
      const ky = TH + ys[k.d];
      g.beginPath();
      g.moveTo(kx, my);
      g.lineTo(kx, ky - 10);
      g.stroke();
      g.beginPath();
      g.moveTo(kx - 9, ky - 14);
      g.lineTo(kx + 9, ky - 14);
      g.lineTo(kx, ky);
      g.closePath();
      g.fill();
    });
  });
  const hasExt = tree.some((t) => t.ext);
  all.forEach((n) => {
    const x = off + n.x;
    const y = TH + ys[n.d];
    const h = depthH[n.d];
    const L = lines(n);
    g.fillStyle = n.ext ? c.ext : c.lv[Math.min(n.d - (hasExt ? 1 : 0), c.lv.length - 1)] || c.lv[0];
    g.beginPath();
    if (g.roundRect) g.roundRect(x, y, NW, h, 10);
    else g.rect(x, y, NW, h);
    g.fill();
    let cy = y + (h - (nh(n) - 40)) / 2;
    g.fillStyle = n.ext ? c.extInk : c.ink;
    g.font = n.ext ? `600 28px ${f.th}` : `700 30px ${f.th}`;
    L.a.forEach((l) => {
      g.fillText(l, x + NW / 2, cy);
      cy += 40;
    });
    if (L.b.length) {
      cy += 8;
      g.fillStyle = c.ink2;
      g.font = `400 25px ${f.th}`;
      L.b.forEach((l) => {
        g.fillText(l, x + NW / 2, cy);
        cy += 34;
      });
    }
    if (L.c) {
      cy += 10;
      g.font = `600 22px ${f.th}`;
      const tw = g.measureText(L.c).width + 28;
      g.fillStyle = "rgba(255,255,255,.16)";
      g.beginPath();
      if (g.roundRect) g.roundRect(x + NW / 2 - tw / 2, cy - 2, tw, 34, 17);
      else g.rect(x + NW / 2 - tw / 2, cy - 2, tw, 34);
      g.fill();
      g.fillStyle = c.ink;
      g.fillText(L.c, x + NW / 2, cy + 3);
    }
  });
  return { cv, W, H };
}

/* ---------------- UI ---------------- */

function ImageCard({
  title,
  hint,
  drawLabel,
  empty,
  fileBase,
  section,
  data,
  company,
  build,
  extraNote,
}: {
  title: string;
  hint: string;
  drawLabel: string;
  empty: string;
  fileBase: string;
  section: Parameters<typeof isFilled>[0];
  data: SectionData;
  company: string;
  build: (data: SectionData, company: string) => Promise<{ cv: HTMLCanvasElement; W: number; H: number; over?: string[] } | null>;
  extraNote?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const blobRef = useRef<Blob | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  async function draw() {
    if (!isFilled(section, data)) {
      setMsg({ text: empty, kind: "err" });
      return null;
    }
    setBusy(true);
    setMsg({ text: "กำลังสร้างภาพ…", kind: "ok" });
    try {
      const out = await build(data, company);
      if (!out) {
        setMsg({ text: empty, kind: "err" });
        setBusy(false);
        return null;
      }
      const blob = await canvasToBlob(out.cv);
      blobRef.current = blob;
      setUrl(URL.createObjectURL(blob));
      const over = out.over?.length ? ` · ข้อความยาวเกินช่อง ${out.over.join(", ")} บางบรรทัดอาจถูกตัด ควรย่อเนื้อหาช่องนั้น` : "";
      setMsg({ text: `สร้างภาพแล้ว ${out.W}×${out.H} px${over}`, kind: "ok" });
      setBusy(false);
      return blob;
    } catch {
      setMsg({ text: "สร้างภาพไม่สำเร็จ ลองกดอีกครั้ง", kind: "err" });
      setBusy(false);
      return null;
    }
  }

  async function download() {
    const blob = await draw();
    if (!blob) return;
    save(`${fileBase}${company.trim() ? "_" + fileSafe(company) : ""}.png`, blob);
  }

  return (
    <Card className="space-y-3 p-4 print:hidden">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button type="button" className="h-11 md:h-9" disabled={busy} onClick={() => void draw()}>
          <ImageIcon className="size-4" />
          {drawLabel}
        </Button>
        {url && (
          <Button type="button" variant="outline" className="h-11 md:h-9" disabled={busy} onClick={() => void download()}>
            <Download className="size-4" />
            ดาวน์โหลด PNG
          </Button>
        )}
      </div>
      {extraNote && <p className="text-sm text-muted-foreground">{extraNote}</p>}
      {msg && (
        <p className={msg.kind === "err" ? "text-sm text-destructive" : "text-sm text-muted-foreground"} role="status">
          {msg.text}
        </p>
      )}
      {url ? (
        <div className="overflow-hidden rounded-xl border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={title} className="h-auto w-full" />
        </div>
      ) : (
        <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">กด &quot;{drawLabel}&quot; เพื่อดูรูป</p>
      )}
    </Card>
  );
}

export function BmcImage({ data, company }: { data: SectionData; company: string }) {
  return (
    <ImageCard
      title="รูป Business Model Canvas"
      hint="รวมทั้ง 9 ช่องไว้ในภาพเดียว แนวนอนสัดส่วนกระดาษ A พิมพ์ลง A4/A3 ได้พอดี สร้างได้ทุกเมื่อ ไม่ต้องรอส่งตรวจ"
      drawLabel="สร้างภาพ Business Model Canvas"
      empty="ยังไม่มีข้อมูลใน Canvas กรอกหรือใช้ AI ช่วยร่างก่อน"
      fileBase="Business_Model_Canvas"
      section={SECTION_BY_ID.bmc}
      data={data}
      company={company}
      build={(d, c) => bmcCanvas(d, c)}
    />
  );
}

export function OrgImage({ data, company }: { data: SectionData; company: string }) {
  return (
    <ImageCard
      title="รูปโครงสร้างองค์กร"
      hint="สร้างแผนผังองค์กรจากตารางหน่วยงาน สร้างได้ทุกเมื่อ ไม่ต้องรอส่งตรวจ"
      drawLabel="สร้างแผนผังองค์กร"
      empty="ยังไม่มีข้อมูล เพิ่มหน่วยงานในตารางก่อน หรือใช้ AI ช่วยร่าง"
      fileBase="Organizational_Chart"
      section={SECTION_BY_ID.org}
      data={data}
      company={company}
      build={(d, c) => orgCanvas(d, c)}
      extraNote={'ระบบต่อสายบังคับบัญชาจากช่อง "รายงานต่อ" ให้ตรงกับ "ตำแหน่งหัวหน้า" ของแถวอื่น ถ้าไม่ตรงกับแถวใด หน่วยงานนั้นจะอยู่บนสุด'}
    />
  );
}
