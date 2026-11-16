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
const FEED_STATUS = ".job-watch/acadex-status.json";

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
    jobs.push({ key: `acadex:${id}`, site: "Acadex", wageText: wage, text: `${decode(title)}\n${place} · ${wage}`, link });
  }
  return jobs;
}

async function acadex() {
  if (existsSync(FEED_STATUS)) {
    const st = JSON.parse(readFileSync(FEED_STATUS, "utf8"));
    if (!st.ok) throw new Error(st.error);
  }
  if (!existsSync(FEED)) throw new Error("ยังไม่มีไฟล์จากเครื่อง Mac (acadex-feed.json)");
  return JSON.parse(readFileSync(FEED, "utf8"));
}

async function ihappy() {
  const url = "https://www.ihappyeducation.com/job-location-summer/";
  const html = await get(url);
  const jobs = [];
  const rowsAll = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const yearOf = (row) => row.match(/class="column-5"[^>]*>([\s\S]*?)<\/td>/)?.[1]?.match(/20\d\d/)?.[0] ?? "";
  const season = rowsAll.map(yearOf).filter(Boolean).sort().at(-1); // ปีล่าสุดในตาราง (ตอนนี้ 2027) ไม่นับแถวปีเก่า
  for (const row of rowsAll) {
    if (yearOf(row) !== season) continue;
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
      key: `ihappy:${season}:${company}|${city}|${state}|${position}`.toLowerCase(),
      site: "iHappy",
      wageText: wage,
      text: `${company} – ${position}\n${city}, ${state} · ${wage}${seats ? ` · ${seats}` : ""}`,
      link,
    });
  }
  return jobs;
}

async function newstep() {
  const r = await fetch("https://api.newstepthailand.com/api/v1/employers/find", {
    headers: { "x-api-key": "byssczyjywbbnfsumuejahcuspzobsod", "user-agent": UA },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`New Step -> ${r.status}`);
  const list = (await r.json()).data ?? [];
  return list
    .filter((e) => ["SUMMER", "ALL"].includes(e.seasonType) && e.isActive !== false && e.isDelete !== true && e.statusOfEmployers === "เปิดรับสมัคร")
    .map((e) => ({
      key: `newstep:${e.id}`,
      site: "New Step",
      text: `${String(e.name).trim()}\n${e.city?.name ?? ""}, ${e.state?.name ?? ""}${e.houseCost ? ` · ที่พัก${e.houseCost}` : ""}`,
      link: `https://newstepthailand.com/jobs/${e.slug}`,
    }));
}

// งานด่วน: รัฐ Alaska หรือค่าแรงสูงกว่า 18 ดอลลาร์ต่อชั่วโมง
const maxWage = (t) => Math.max(0, ...[...t.matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map((m) => +m[1]).filter((n) => n <= 100));
// รายชื่อเฝ้าพิเศษ: นายจ้างที่เคยลงทุกปีและคุณสนใจ ถ้าโผล่ในเว็บไหนจะเด้งด่วน
const WATCH = [
  [/49th state brewing/, "49th State Brewing (Alaska $18)"],
  [/talkeetna alaskan lodge/, "Talkeetna Alaskan Lodge (Alaska)"],
  [/subway.*denali|denali.*subway/, "Subway Denali (Alaska)"],
  [/lemongrass.*fairbanks|fairbanks.*lemongrass/, "Lemongrass Thai Fairbanks (Alaska)"],
  [/aramark.*citi field|citi field/, "Aramark Citi Field (New York $21)"],
  [/ghirardelli/, "Ghirardelli Chocolate (San Francisco $19)"],
  [/rick's caf/, "Rick's Cafe Naples (Maine $19)"],
  [/alaska juneau/, "Alaska Juneau Mining Company (Alaska)"],
  [/seasalt/, "Seasalt (Seward, Alaska)"],
  [/fairfield inn.*anchorage|anchorage.*fairfield inn/, "Fairfield Inn Anchorage (Alaska)"],
  [/taco bell.*kalispell|kalispell.*taco bell/, "Taco Bell Kalispell (Montana $19)"],
  [/hard rock hotel.*atlantic city|atlantic city.*hard rock hotel/, "Hard Rock Hotel Atlantic City ($19)"],
];
function urgentReasons(j) {
  const r = [];
  const text = j.text.toLowerCase().replace(/[\u2018\u2019]/g, "'");
  for (const [re, label] of WATCH) if (re.test(text)) r.push(`⭐ เฝ้าพิเศษ: ${label}`);
  if (/alaska/i.test(j.text)) r.push("รัฐ Alaska");
  const w = maxWage(j.wageText ?? "");
  if (w > 18) r.push(`ค่าแรง $${w}/ชม.`);
  return r;
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

if (process.argv.includes("--fetch-acadex")) {
  mkdirSync(".job-watch", { recursive: true });
  const setStatus = (st) => {
    const text = JSON.stringify(st);
    if (!existsSync(FEED_STATUS) || readFileSync(FEED_STATUS, "utf8") !== text) writeFileSync(FEED_STATUS, text);
  };
  try {
    const jobs = await acadexFetch();
    if (jobs.length < 20) throw new Error(`เจอแค่ ${jobs.length} งาน หน้าเว็บอาจเปลี่ยน`);
    writeFileSync(FEED, JSON.stringify(jobs));
    setStatus({ ok: true });
    console.log(`acadex: ดึงได้ ${jobs.length} งาน`);
  } catch (e) {
    setStatus({ ok: false, error: String(e.message ?? e) });
    console.error("acadex ล้มเหลว:", e.message ?? e);
  }
  process.exit(0);
}
const results = await Promise.allSettled([acadex(), ihappy(), newstep()]);
if (process.env.LINE_TEST) {
  let m = "🧪 ตัวอย่างข้อความแจ้งเตือน (ทดสอบ ไม่ใช่งานใหม่จริง)\n\n🆕 มีงาน Work & Travel ใหม่";
  for (const res of results) if (res.status === "fulfilled" && res.value[0]) m += `\n\n[${res.value[0].site}] ${res.value[0].text}\n${res.value[0].link}`;
  await pushLine(m);
  const all = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const ex = all.find((j) => urgentReasons(j).length);
  if (ex) await pushLine(`🧪 ตัวอย่างแบบด่วน\n🚨🚨 ด่วน! งานใหม่ (${urgentReasons(ex).join(" + ")}) 🚨🚨\n\n[${ex.site}] ${ex.text}\n${ex.link}`);
}
const state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { seen: {}, seeded: {} };
const fresh = [];
const alerts = [];
const names = ["acadex", "ihappy", "newstep"];
results.forEach((res, i) => {
  const name = names[i];
  if (res.status === "rejected" || res.value.length < 20) {
    const why = String(res.reason?.message ?? res.reason ?? `เจอแค่ ${res.value.length} งาน`);
    console.error(`${name}: อ่านไม่สำเร็จหรือหน้าเว็บเปลี่ยน`, why);
    process.exitCode = 1; // ไม่แตะข้อมูลเดิม กันแจ้งเตือนซ้ำรอบหน้า
    state.blocked ??= {};
    if (!state.blocked[name]) { // แจ้งแค่ครั้งแรกที่พัง กันข้อความรัว
      state.blocked[name] = true;
      alerts.push(`⚠️ เช็กเว็บ ${name} ไม่ได้ (${why})${/40[13]|429/.test(why) ? "\nเว็บอาจบล็อกเราอยู่" : ""}`);
    }
    return;
  }
  if (state.blocked?.[name]) { delete state.blocked[name]; alerts.push(`✅ เว็บ ${name} กลับมาเช็กได้ปกติแล้ว`); }
  const first = !state.seeded[name];
  if (name === "newstep") { // งานที่เต็มแล้วถูกลบออกจากความจำ ถ้ากลับมาเปิดอีกครั้งจะแจ้งเตือน
    const open = new Set(res.value.map((j) => j.key));
    for (const k of Object.keys(state.seen)) if (k.startsWith("newstep:") && !open.has(k)) delete state.seen[k];
  }
  for (const j of res.value) {
    if (state.seen[j.key]) continue;
    state.seen[j.key] = new Date().toISOString();
    if (!first) fresh.push(j);
  }
  state.seeded[name] = true;
  console.log(`${name}: ${res.value.length} งาน${first ? " (รอบแรก เก็บไว้เฉย ๆ ไม่แจ้งเตือน)" : ""}`);
});

for (const a of alerts) await pushLine(a);
if (fresh.length) {
  const urgent = fresh.filter((j) => urgentReasons(j).length);
  for (const j of urgent) await pushLine(`🚨🚨 ด่วน! งานใหม่ (${urgentReasons(j).join(" + ")}) 🚨🚨\n\n[${j.site}] ${j.text}\n${j.link}`);
  const rest = fresh.filter((j) => !urgentReasons(j).length);
  if (rest.length) {
  const header = `🆕 มีงาน Work & Travel ใหม่ ${rest.length} งาน`;
  let msg = header;
  for (const j of rest) {
    const item = `\n\n[${j.site}] ${j.text}\n${j.link}`;
    if ((msg + item).length > 4800) { await pushLine(msg); msg = "(ต่อ)"; }
    msg += item;
  }
  await pushLine(msg);
  }
}
mkdirSync(".job-watch", { recursive: true });
writeFileSync(STATE, JSON.stringify(state, null, 1));
