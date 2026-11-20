// ตัวรับข้อความจาก LINE: พิมพ์ "ตรวจ" แล้วบอทตอบสถานะระบบแจ้งเตือนงาน
// ใช้แค่ข้อมูลสาธารณะของ GitHub (ไม่แตะฐานข้อมูลหรือข้อมูลผู้ใช้ของแอป)
import { createHmac, timingSafeEqual } from "node:crypto";

export const dynamic = "force-dynamic";

const REPO = "napatsamsenwit-svg/napatsamsenwit-svg-app-3";
const COMMANDS = ["ตรวจ", "ตรวจสอบ", "สถานะ", "check", "status"];

type Job = { s?: string; open?: boolean };
type Run = { status: string; conclusion: string | null; created_at: string; updated_at: string };

const minutesAgo = (iso: string | number) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
const ago = (m: number) => (m < 60 ? `${m} นาที` : `${Math.floor(m / 60)} ชม. ${m % 60} นาที`);

async function gh<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store", headers: { "user-agent": "job-watch-status", accept: "application/vnd.github+json" } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

async function buildStatus(): Promise<string> {
  const [wf, runs, state] = await Promise.all([
    gh<{ state: string }>(`https://api.github.com/repos/${REPO}/actions/workflows/job-watch.yml`),
    gh<{ workflow_runs: Run[] }>(`https://api.github.com/repos/${REPO}/actions/workflows/job-watch.yml/runs?per_page=10`),
    gh<{ jobs?: Record<string, Job>; macAt?: number; macStale?: boolean; blocked?: Record<string, boolean>; failN?: Record<string, number> }>(
      `https://raw.githubusercontent.com/${REPO}/main/.job-watch/seen.json`,
    ),
  ]);

  const problems: string[] = [];
  const lines: string[] = [];

  if (!wf || !runs || !state) {
    return "⚠️ ตรวจไม่สำเร็จ: เชื่อมต่อ GitHub ไม่ได้ในตอนนี้ ลองพิมพ์ \"ตรวจ\" อีกครั้งใน 1 นาที ถ้ายังเป็นอีก ให้บอก Claude";
  }

  // 1) ตัวตั้งเวลาของ GitHub
  if (wf.state !== "active") problems.push(`❌ GitHub ปิดตัวตั้งเวลาไว้ (${wf.state}) ต้องเปิดใหม่ที่แท็บ Actions ของโปรเจกต์ หรือบอก Claude`);
  const list = runs.workflow_runs ?? [];
  const running = list.find((r) => r.status === "in_progress");
  const lastDone = list.find((r) => r.status === "completed");
  if (running) lines.push("✅ ระบบตรวจงานกำลังทำงานอยู่ตอนนี้");
  else if (lastDone) {
    const m = minutesAgo(lastDone.updated_at);
    lines.push(`${m > 30 ? "⚠️" : "✅"} รอบตรวจล่าสุดเมื่อ ${ago(m)} ที่แล้ว`);
    if (m > 30) problems.push("⚠️ ไม่มีรอบตรวจใหม่เกิน 30 นาที ตัวตั้งเวลาของ GitHub อาจหยุดหรือล่าช้า");
  } else problems.push("❌ ไม่พบประวัติการตรวจเลย");
  const done = list.filter((r) => r.status === "completed").slice(0, 5);
  const failed = done.filter((r) => r.conclusion === "failure").length;
  if (failed >= 3) problems.push(`❌ ${done.length} รอบหลังสุดล้มเหลว ${failed} รอบ (ระบบอาจพัง) ให้บอก Claude`);

  // 2) Mac (ตรวจ Acadex)
  if (typeof state.macAt === "number") {
    const m = minutesAgo(state.macAt);
    if (m > 25 || state.macStale) problems.push(`⚠️ Mac ไม่ได้ส่งข้อมูล Acadex มา ${ago(m)} (เครื่องอาจหลับ ปิด หรือไม่มีอินเทอร์เน็ต) ให้เปิดเครื่อง/ต่อเน็ต Acadex จึงจะกลับมาตรวจได้`);
    else lines.push(`✅ Mac ส่งข้อมูล Acadex ปกติ (ล่าสุด ${ago(m)} ที่แล้ว)`);
  }

  // 3) เว็บที่เราดึงข้อมูลได้ไหม
  const blocked = Object.keys(state.blocked ?? {});
  if (blocked.length) problems.push(`⚠️ อ่านเว็บไม่ได้: ${blocked.join(", ")} (อาจโดนบล็อกหรือเว็บเปลี่ยนรูปแบบ)`);
  else lines.push("✅ อ่านข้อมูลทั้ง 3 เว็บได้ปกติ (Acadex, iHappy, New Step)");

  // 4) ภาพรวมงาน
  const count = (site: string) => {
    const js = Object.values(state.jobs ?? {}).filter((j) => j.s === site);
    return `${site} เปิด ${js.filter((j) => j.open).length}/${js.length}`;
  };
  lines.push(`📊 ${count("Acadex")} · ${count("iHappy")} · ${count("New Step")}`);

  const head = problems.length ? "⚠️ ระบบมีจุดที่ต้องดู" : "✅ ระบบปกติดี";
  return [head, "", ...problems, ...(problems.length ? [""] : []), ...lines, "", "ถ้าเงียบผิดปกติ บอก Claude ให้เข้าไปแก้ได้เลย"].join("\n");
}

function validSignature(body: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  const given = Buffer.from(signature, "base64");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function POST(request: Request) {
  const secret = process.env.LINE_CHANNEL_SECRET;
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!secret || !token) return new Response("not configured", { status: 503 });

  const body = await request.text();
  if (!validSignature(body, request.headers.get("x-line-signature"), secret)) return new Response("bad signature", { status: 401 });

  let events: { type: string; replyToken?: string; message?: { type: string; text?: string } }[] = [];
  try {
    events = JSON.parse(body).events ?? [];
  } catch {
    return new Response("bad request", { status: 400 });
  }

  const wanted = events.filter(
    (e) => e.type === "message" && e.message?.type === "text" && e.replyToken && COMMANDS.includes((e.message.text ?? "").trim().toLowerCase()),
  );
  if (wanted.length) {
    const text = await buildStatus();
    await Promise.all(
      wanted.map((e) =>
        fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
          body: JSON.stringify({ replyToken: e.replyToken, messages: [{ type: "text", text }] }),
        }).catch(() => null),
      ),
    );
  }
  return Response.json({ ok: true });
}

// เปิดลิงก์นี้ในเบราว์เซอร์ จะเห็นแค่ว่าตัวรับข้อความพร้อมหรือยัง (ไม่เปิดเผยข้อมูลอื่น)
export function GET() {
  return Response.json({ ok: true, configured: Boolean(process.env.LINE_CHANNEL_SECRET && process.env.LINE_CHANNEL_ACCESS_TOKEN) });
}
