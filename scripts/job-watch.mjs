// เช็กงาน Work and Travel ใหม่ แล้วแจ้งเตือนทาง LINE
// ใช้: node scripts/job-watch.mjs   (ต้องมี LINE_CHANNEL_ACCESS_TOKEN และ LINE_USER_ID ถ้าจะส่งจริง)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const STATE = ".job-watch/seen.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const decode = (s) =>
  s.replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&#8217;/g, "'").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
const clean = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url) {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "th-TH,th;q=0.9,en;q=0.8", "upgrade-insecure-requests": "1", "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", "sec-fetch-site": "none" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

const FEED = ".job-watch/acadex-feed.json";

// ดึงจากเว็บ Acadex จริง (เว็บนี้บล็อกเซิร์ฟเวอร์ GitHub เลยให้เครื่อง Mac ดึงแล้วส่งไฟล์ขึ้นมา)
async function acadexFetch() {
  const url = "https://www.acadexthailand.com/program/work-and-travel-summer/";
  const html = await get(url);
  const jobs = [];
  for (const block of html.split('<div class="bottom_listdetail">').slice(1)) {
    const id = block.match(/data-pro_id="(\d+)"/)?.[1];
    const title = block.match(/bottom_listdetail_ti">([^<]+)</)?.[1];
    if (!id || !title) continue;
    const place = clean(block.match(/bottom_listdetail_lo[^>]*>(.*?)<\/div>/s)?.[1] ?? "");
    const wage = clean(block.match(/program_prict">(.*?)<\/div>/s)?.[1] ?? "");
    const link = block.match(/href="(https:\/\/www\.acadexthailand\.com\/location\/[^"]+)"/)?.[1] ?? url;
    jobs.push({ key: `acadex:${id}`, site: "Acadex", text: `${decode(title)}\n${place} · ${wage}`, link });
  }
  return jobs;
}

async function acadex() {
  if (!existsSync(FEED)) throw new Error("ยังไม่มีไฟล์จากเครื่อง Mac (acadex-feed.json)");
  return JSON.parse(readFileSync(FEED, "utf8"));
}

async function ihappy() {
  const url = "https://www.ihappyeducation.com/job-location-summer/";
  const html = await get(url);
  const jobs = [];
  for (const row of html.match(/<tr[\s\S]*?<\/tr>/g) ?? []) {
    const col = (n) => row.match(new RegExp(`class="column-${n}"[^>]*>([\\s\\S]*?)</td>`))?.[1];
    const company = clean(col(6) ?? "");
    if (!company) continue;
    const city = clean(col(7) ?? "");
    const state = clean(col(8) ?? "");
    const [pos, ...rest] = (col(9) ?? "").split(/<br\s*\/?>/);
    const position = clean(pos);
    const seats = clean(rest.join(" "));
    const wage = clean(col(10) ?? "");
    const link = row.match(/href="\s*([^"\s]+)\s*"/)?.[1] ?? url;
    jobs.push({
      key: `ihappy:${company}|${city}|${state}|${position}`.toLowerCase(),
      site: "iHappy",
      text: `${company} – ${position}\n${city}, ${state} · ${wage}${seats ? ` · ${seats}` : ""}`,
      link,
    });
  }
  return jobs;
}

async function pushLine(text) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  if (!token || !to) { console.log("(ยังไม่ได้ตั้งค่า LINE แสดงข้อความแทน)\n" + text); return; }
  const r = await fetch("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: "text", text: text.slice(0, 4900) }] }),
  });
  if (!r.ok) throw new Error(`LINE ${r.status}: ${await r.text()}`);
}

if (process.env.LINE_TEST) await pushLine("✅ ทดสอบสำเร็จ! ต่อไปถ้ามีงาน Work & Travel ใหม่ จะแจ้งเตือนที่นี่");
if (process.argv.includes("--fetch-acadex")) {
  const jobs = await acadexFetch();
  if (jobs.length < 20) throw new Error(`Acadex เจอแค่ ${jobs.length} งาน`);
  mkdirSync(".job-watch", { recursive: true });
  writeFileSync(FEED, JSON.stringify(jobs));
  console.log(`acadex: ดึงได้ ${jobs.length} งาน`);
  process.exit(0);
}
const results = await Promise.allSettled([acadex(), ihappy()]);
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { seen: {}, seeded: {} };
const fresh = [];
const names = ["acadex", "ihappy"];
results.forEach((res, i) => {
  const name = names[i];
  if (res.status === "rejected" || res.value.length < 20) {
    console.error(`${name}: อ่านไม่สำเร็จหรือหน้าเว็บเปลี่ยน`, res.reason ?? `เจอแค่ ${res.value.length} งาน`);
    process.exitCode = 1; // ไม่แตะข้อมูลเดิม กันแจ้งเตือนซ้ำรอบหน้า
    return;
  }
  const first = !state.seeded[name];
  for (const j of res.value) {
    if (state.seen[j.key]) continue;
    state.seen[j.key] = new Date().toISOString();
    if (!first) fresh.push(j);
  }
  state.seeded[name] = true;
  console.log(`${name}: ${res.value.length} งาน${first ? " (รอบแรก เก็บไว้เฉย ๆ ไม่แจ้งเตือน)" : ""}`);
});

if (fresh.length) {
  const header = `🆕 มีงาน Work & Travel ใหม่ ${fresh.length} งาน`;
  let msg = header;
  for (const j of fresh) {
    const item = `\n\n[${j.site}] ${j.text}\n${j.link}`;
    if ((msg + item).length > 4800) { await pushLine(msg); msg = "(ต่อ)"; }
    msg += item;
  }
  await pushLine(msg);
}
mkdirSync(".job-watch", { recursive: true });
writeFileSync(STATE, JSON.stringify(state, null, 1));
