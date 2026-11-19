// เช็กงาน Work and Travel ใหม่ แล้วแจ้งเตือนทาง LINE
// ใช้: node scripts/job-watch.mjs   (ต้องมี LINE_CHANNEL_ACCESS_TOKEN และ LINE_USER_ID ถ้าจะส่งจริง)
// เกณฑ์ต่าง ๆ (รัฐ ค่าแรง รายชื่อเฝ้า วันสำคัญ) อยู่ใน job-watch.config.json
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";

const CFG = JSON.parse(readFileSync("job-watch.config.json", "utf8"));
const STATE = process.env.STATE_FILE ?? ".job-watch/seen.json";
const FEED = ".job-watch/acadex-feed.json";
const FEED_STATUS = ".job-watch/acadex-status.json";
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const DAY = 24 * 3600 * 1000;

const decode = (s) =>
  s.replace(/&#8211;/g, "–").replace(/&amp;/g, "&").replace(/&#038;/g, "&").replace(/&#8217;/g, "'").replace(/&nbsp;/g, " ").replace(/&quot;/g, '"').replace(/&#039;/g, "'");
const clean = (s) => decode(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

async function get(url) {
  const r = await fetch(url, {
    headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "accept-language": "th-TH,th;q=0.9,en;q=0.8", "upgrade-insecure-requests": "1", "sec-fetch-dest": "document", "sec-fetch-mode": "navigate", "sec-fetch-site": "none" },
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return r.text();
}

// ---------- ดึงงานจากแต่ละเว็บ ----------
// งานทุกชิ้นมี: key, site, text, link, wageText, open(true/false), emp, city, seats(ถ้ามี)

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
    const open = block.includes('program_top_available">Available');
    const seats = block.match(/program_bot_available">([^<]*)</)?.[1]?.trim() ?? "";
    jobs.push({ key: `acadex:${id}`, site: "Acadex", wageText: wage, open, seats, text: `${decode(title)}\n${place} · ${wage}`, link });
  }
  return jobs;
}

async function acadex() {
  if (existsSync(FEED_STATUS)) {
    const st = JSON.parse(readFileSync(FEED_STATUS, "utf8"));
    if (!st.ok) throw new Error(st.error);
  }
  if (!existsSync(FEED)) throw new Error("ยังไม่มีไฟล์จากเครื่อง Mac (acadex-feed.json)");
  return JSON.parse(readFileSync(FEED, "utf8")).map((j) => {
    const [first, rest = ""] = j.text.split("\n");
    return { ...j, open: j.open ?? false, emp: first.replace(/\s*\(.*$/, "").split(",")[0], city: rest.split(",")[0].trim() };
  });
}

async function ihappy() {
  const url = "https://www.ihappyeducation.com/job-location-summer/";
  const html = await get(url);
  const jobs = [];
  const rowsAll = html.match(/<tr[\s\S]*?<\/tr>/g) ?? [];
  const yearOf = (row) => row.match(/class="column-5"[^>]*>([\s\S]*?)<\/td>/)?.[1]?.match(/20\d\d/)?.[0] ?? "";
  const season = rowsAll.map(yearOf).filter(Boolean).sort().at(-1); // ปีล่าสุดในตาราง ไม่นับแถวปีเก่า
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
      open: /available-1/i.test(col(1) ?? ""),
      emp: company,
      city,
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
    .filter((e) => ["SUMMER", "ALL"].includes(e.seasonType) && e.isActive !== false && e.isDelete !== true)
    .map((e) => ({
      key: `newstep:${e.id}`,
      site: "New Step",
      wageText: "",
      open: e.statusOfEmployers === "เปิดรับสมัคร",
      emp: String(e.name).trim(),
      city: e.city?.name ?? "",
      text: `${String(e.name).trim()}\n${e.city?.name ?? ""}, ${e.state?.name ?? ""}${e.houseCost ? ` · ที่พัก${e.houseCost}` : ""}`,
      link: `https://newstepthailand.com/jobs/${e.slug}`,
    }));
}

// ---------- เกณฑ์ความสำคัญ ----------
const maxWage = (t) => Math.max(0, ...[...t.replace(/\(\s*OT[^)]*\)/gi, "").matchAll(/\$\s*(\d+(?:\.\d+)?)/g)].map((m) => +m[1]).filter((n) => n <= 100));
const WATCH = CFG.watch.map((w) => [new RegExp(w.pattern), w.label]);

function reasons(j) {
  const r = [];
  const text = j.text.toLowerCase().replace(/[‘’]/g, "'");
  for (const [re, label] of WATCH) if (re.test(text)) r.push(`⭐ เฝ้าพิเศษ: ${label}`);
  for (const s of CFG.favStates) if (text.includes(s.toLowerCase())) r.push(`รัฐ ${s[0].toUpperCase()}${s.slice(1)}`);
  const w = maxWage(j.wageText ?? "");
  if (w > CFG.minWageAbove) r.push(`ค่าแรง $${w}/ชม.`);
  return r;
}
const isFav = (j) => reasons(j).some((x) => !x.startsWith("⭐"));
// ค่าแรงต่ำกว่าเกณฑ์ (และไม่ใช่งานสำคัญ) รวมเป็นก้อนเดียว ส่วนค่าแรงที่ไม่ทราบ (New Step) ถือว่าสำคัญพอจะเด้งเดี่ยว
const isLowWage = (j) => {
  const w = maxWage(j.wageText ?? "");
  return w > 0 && w < CFG.batchBelowWage && !reasons(j).length;
};

const STOP = new Set(["the", "inc", "llc", "co", "company", "and", "at", "of", "hap"]);
const toks = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w));
const empKey = (j) => {
  const t = toks(j.emp).slice(0, 2).join(" "), c = toks(j.city)[0] ?? "";
  return t && c ? `${t}|${c}` : "";
};

// ---------- ส่ง LINE ----------
async function pushMany(texts) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const to = process.env.LINE_USER_ID;
  for (let i = 0; i < texts.length; i += 5) {
    const messages = texts.slice(i, i + 5).map((t) => ({ type: "text", text: t.slice(0, 4900) }));
    if (!token || !to) { console.log("(ยังไม่ได้ตั้งค่า LINE แสดงข้อความแทน)\n" + messages.map((m) => m.text).join("\n-----\n")); continue; }
    const r = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ to, messages }),
    });
    if (!r.ok) throw new Error(`LINE ${r.status}: ${await r.text()}`);
  }
}
const pushLine = (t) => pushMany([t]);

const fmt = (j) => `[${j.site}] ${j.text}${j.seats ? ` · เหลือ ${j.seats} ที่` : ""}\n${j.link}`;

// ---------- โหมดดึงข้อมูล Acadex บน Mac ----------
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

// ---------- แจ้งเตือนเมื่อสคริปต์พังทั้งรอบ (เรียกจาก workflow ตอน failure) ----------
if (process.argv.includes("--notify-crash")) {
  const F = ".job-watch/crash.json";
  const last = existsSync(F) ? JSON.parse(readFileSync(F, "utf8")).at ?? 0 : 0;
  if (Date.now() - last > 6 * 3600e3) { // กันข้อความรัว: แจ้งไม่เกิน 6 ชั่วโมงละครั้ง
    mkdirSync(".job-watch", { recursive: true });
    writeFileSync(F, JSON.stringify({ at: Date.now() }));
    await pushLine(`🛑 ระบบแจ้งเตือนงานทำงานผิดพลาด\nช่วงนี้อาจพลาดงานใหม่ ให้บอก Claude ให้เข้าไปแก้ทันที\n${process.env.RUN_URL ?? ""}`).catch(() => {});
  }
  process.exit(0);
}

// โพสต์ใหม่ของ iHappy (ขึ้นก่อนตารางงานหลายชั่วโมง) ใช้เป็นสัญญาณเตือนล่วงหน้า
const decodeHtml = (t) => t.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&amp;/g, "&");
async function ihappyPosts() {
  const r = JSON.parse(await get("https://www.ihappyeducation.com/wp-json/wp/v2/posts?categories=33&per_page=40&orderby=date&_fields=id,link,title"));
  if (!Array.isArray(r) || r.length < 5) throw new Error("อ่านโพสต์ iHappy ไม่ได้");
  return r.map((p) => ({ id: p.id, link: p.link, title: decodeHtml(p.title?.rendered ?? "") }));
}

// ---------- ดึงข้อมูลทุกเว็บ ----------
const postsPromise = ihappyPosts().catch((e) => { console.error("posts:", e.message); return null; });
const results = await Promise.allSettled([acadex(), ihappy(), newstep()]);
const posts = await postsPromise;
const names = ["acadex", "ihappy", "newstep"];
const okJobs = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));

if (process.env.LINE_DIGEST) {
  const part = (site) =>
    okJobs.filter((j) => j.site === site && j.open && isFav(j)).sort((a, b) => maxWage(b.wageText ?? "") - maxWage(a.wageText ?? "")).map((j) => `• ${j.text.replace("\n", " — ")}${j.seats ? ` · เหลือ ${j.seats} ที่` : ""}\n${j.link}`);
  const a = part("Acadex"), h = part("iHappy");
  await pushMany([
    `⭐🚨 สรุปงานน่าสนใจ ณ ตอนนี้\n(Alaska หรือค่าแรงเกิน $${CFG.minWageAbove} และยังเปิดอยู่)\n\n[Acadex] ${a.length} งาน\n${a.join("\n\n") || "ไม่มี"}`,
    `[iHappy] ${h.length} งาน\n${h.join("\n\n") || "ไม่มี"}`,
    `👀 รายชื่อที่เฝ้ารอ (ถ้าโผล่จะเด้งทันที)\n\n${CFG.watch.map((w) => `• ${w.label}`).join("\n")}`,
  ]);
  process.exit(0);
}

if (process.env.LINE_TEST) {
  const sample = okJobs.filter((j) => j.open).slice(0, 3);
  const fav = okJobs.find((j) => j.open && isFav(j));
  await pushMany([
    `🧪 ตัวอย่างข้อความแจ้งเตือน (ทดสอบ ไม่ใช่งานใหม่จริง)\n\n🆕 งานใหม่\n${sample.map(fmt).join("\n\n")}`,
    ...(fav ? [`🧪 ตัวอย่างแบบสำคัญ\n🚨🚨 ด่วน! งานใหม่ (${reasons(fav).join(" + ")}) 🚨🚨\n\n${fmt(fav)}`] : []),
  ]);
}

// ---------- ความจำ (state) ----------
const now = new Date().toISOString();
let state = existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : {};
if (!state.jobs) state = { jobs: {}, seeded: {}, blocked: state.blocked ?? {}, events: [], reminders: {} }; // ย้ายจากแบบเก่า: รอบนี้เก็บค่าเริ่มต้นเงียบ ๆ
state.events ??= []; state.reminders ??= {}; state.blocked ??= {}; state.failN ??= {}; state.posts ??= {};

const fresh = [], reopened = [], alerts = [];
results.forEach((res, i) => {
  const name = names[i];
  if (res.status === "rejected" || res.value.length < 20) {
    const why = String(res.reason?.message ?? res.reason ?? `เจอแค่ ${res.value.length} งาน`);
    console.error(`${name}: อ่านไม่สำเร็จหรือหน้าเว็บเปลี่ยน`, why);
    state.failN[name] = (state.failN[name] ?? 0) + 1;
    if (state.failN[name] >= 3 && !state.blocked[name]) { // พังติดกัน 3 รอบถึงแจ้ง (กันสัญญาณสะดุดชั่วคราว) และแจ้งครั้งเดียว
      state.blocked[name] = true;
      alerts.push(`⚠️ เช็กเว็บ ${name} ไม่ได้ (${why})${/40[13]|429/.test(why) ? "\nเว็บอาจบล็อกเราอยู่" : ""}`);
    }
    return;
  }
  state.failN[name] = 0;
  if (state.blocked[name]) { delete state.blocked[name]; alerts.push(`✅ เว็บ ${name} กลับมาเช็กได้ปกติแล้ว`); }
  const first = !state.seeded[name];
  // แถวที่รหัสซ้ำกัน (ตำแหน่งเดียวกันลงหลายแถว) รวมเป็นงานเดียว ถือว่าเปิดถ้ามีแถวใดแถวหนึ่งเปิด กันป้ายเปิด/เต็มสลับไปมา
  const uniq = new Map();
  for (const j of res.value) uniq.set(j.key, uniq.has(j.key) ? { ...uniq.get(j.key), open: uniq.get(j.key).open || j.open } : j);
  for (const j of uniq.values()) {
    const prev = state.jobs[j.key];
    const meta = { t: j.text.split("\n")[0].slice(0, 90), l: j.link, f: isFav(j) ? 1 : 0, s: j.site };
    if (!prev) {
      state.jobs[j.key] = { ...meta, first: now, tracked: !first, open: j.open, fullAt: null, reopens: 0 };
      if (!first) fresh.push(j);
    } else {
      Object.assign(prev, meta);
      if (prev.open && !j.open) { prev.open = false; prev.fullAt = now; }
      else if (!prev.open && j.open) { prev.open = true; prev.reopens++; prev.reopenedAt = now; reopened.push(j); state.events.push({ k: j.key, at: now }); }
    }
  }
  state.seeded[name] = true;
  console.log(`${name}: ${res.value.length} งาน${first ? " (รอบแรก เก็บไว้เฉย ๆ ไม่แจ้งเตือน)" : ""}`);
});
state.events = state.events.slice(-200);

// iHappy: โพสต์ใหม่ที่ยังไม่ขึ้นตาราง
if (posts) {
  const seedP = Object.keys(state.posts).length === 0;
  const newP = posts.filter((p) => !state.posts[p.id]);
  state.posts = Object.fromEntries(posts.map((p) => [p.id, 1]));
  if (!seedP && newP.length) {
    const byT = new Map();
    for (const p of newP) byT.set(p.title, [...(byT.get(p.title) ?? []), p]);
    const entries = [...byT];
    for (const [title, ps] of entries.slice(0, 8)) {
      const rs = reasons({ text: title.replace(/\//g, ", "), wageText: "" });
      alerts.push(`${rs.length ? `🚨🚨 ด่วน! iHappy เพิ่งโพสต์ (${rs.join(" + ")}) 🚨🚨` : "📝 iHappy เพิ่งโพสต์งานใหม่"}\n(ตารางงานอาจยังไม่อัปเดต รอสักพัก)\n\n${title}${ps.length > 1 ? ` · ${ps.length} ตำแหน่ง` : ""}\n${ps[0].link}`);
    }
    if (entries.length > 8) alerts.push(`📝 iHappy โพสต์งานใหม่อีก ${entries.length - 8} รายการ ดูในเว็บ`);
  }
}

// เช็กว่า Mac ยังส่งข้อมูล Acadex มาอยู่ไหม
const ev = process.env.GH_EVENT;
if (process.env.MAC_AT) state.macAt = Number(process.env.MAC_AT) * 1000;
else if (ev === "push" || !state.macAt) state.macAt = Date.now();
const macAge = Date.now() - state.macAt;
if (macAge > 25 * 60e3 && !state.macStale && ev === "schedule") {
  state.macStale = true;
  alerts.push(`⚠️ Mac ไม่ได้ส่งข้อมูล Acadex มา ${Math.round(macAge / 60e3)} นาทีแล้ว (เครื่องอาจหลับหรือปิด)\nAcadex หยุดอัปเดตจนกว่าจะเปิดเครื่อง (iHappy และ New Step ยังตรวจต่อตามปกติ)`);
} else if (state.macStale && macAge < 15 * 60e3) {
  delete state.macStale;
  alerts.push("✅ Mac กลับมาส่งข้อมูลปกติแล้ว");
}

// ---------- แจ้งเตือนทันที ----------
const outbox = [...alerts];

// รวมงานของนายจ้างเดียวกันที่ลงหลายเว็บในรอบเดียวเป็นข้อความเดียว
const groups = new Map();
for (const j of fresh) {
  const k = empKey(j) || j.key;
  groups.set(k, [...(groups.get(k) ?? []), j]);
}
const otherSites = (g, k) =>
  okJobs.filter((x) => empKey(x) === k && !g.some((y) => y.site === x.site)).map((x) => `ℹ️ นายจ้างนี้ลงที่ ${x.site} ด้วย (${x.open ? "เปิด" : "เต็ม"}${maxWage(x.wageText ?? "") ? ` $${maxWage(x.wageText ?? "")}` : ""})\n${x.link}`);

let single = 0;
const lowBatch = [];
const flood = fresh.length > CFG.maxIndividualAlerts;
if (flood) outbox.push(`⚠️ พบงานใหม่พร้อมกัน ${fresh.length} งาน (ผิดปกติ อาจเป็นเว็บเปลี่ยนรูปแบบ) ส่งเฉพาะงานสำคัญด้านล่าง`);
for (const [k, g] of groups) {
  const rs = [...new Set(g.flatMap(reasons))];
  const sites = [...new Set(g.map((j) => j.site))].join(" + ");
  if (rs.length) {
    outbox.push(`🚨🚨 ด่วน! งานใหม่ (${rs.join(" + ")}) 🚨🚨\n\n${g.map(fmt).join("\n\n")}${otherSites(g, k).length ? `\n\n${otherSites(g, k).join("\n")}` : ""}`);
    single++;
  } else if (g.every(isLowWage) || flood) {
    lowBatch.push(...g);
  } else {
    outbox.push(`🆕 งานใหม่ (${sites})\n\n${g.map(fmt).join("\n\n")}${otherSites(g, k).length ? `\n\n${otherSites(g, k).join("\n")}` : ""}`);
    single++;
  }
}
if (lowBatch.length && !flood) {
  let msg = `🆕 งานใหม่ค่าแรงต่ำกว่า $${CFG.batchBelowWage} รวม ${lowBatch.length} งาน`;
  for (const j of lowBatch) {
    const item = `\n\n${fmt(j)}`;
    if ((msg + item).length > 4800) { outbox.push(msg); msg = "(ต่อ)"; }
    msg += item;
  }
  outbox.push(msg);
} else if (lowBatch.length && flood) {
  outbox.push(`🆕 งานใหม่ที่ไม่ใช่งานสำคัญอีก ${lowBatch.length} งาน (ไม่ส่งรายละเอียด ดูในเว็บ)`);
}

// ที่ว่างหลุดกลับมา (งานที่เคยเต็มกลับมาเปิด เช่น มีคนถอนตัว)
for (const j of reopened) {
  const rs = reasons(j);
  outbox.push(`${rs.length ? "🚨♻️ ที่ว่างหลุดกลับมา" : "♻️ ที่ว่างกลับมาเปิดอีกครั้ง"}${rs.length ? ` (${rs.join(" + ")}) ♻️🚨` : ""}\n\n${fmt(j)}`);
}

// ---------- สรุปรายวัน + เตือนวันสำคัญ (รันตอน 8 โมงเช้า) ----------
if (process.env.LINE_DAILY) {
  const ict = new Date(Date.now() + 7 * 3600e3);
  const today = ict.toISOString().slice(0, 10);
  const since = Date.now() - DAY;
  const jobsAll = Object.values(state.jobs);
  const newBy = (s) => jobsAll.filter((x) => x.s === s && x.tracked && Date.parse(x.first) > since).length;
  const cnt = (s) => { const a = okJobs.filter((j) => j.site === s); return `${a.length} งาน เปิด ${a.filter((j) => j.open).length}`; };
  const favOpen = okJobs.filter((j) => j.open && isFav(j)).sort((a, b) => maxWage(b.wageText ?? "") - maxWage(a.wageText ?? ""));

  // ความเร็ว iHappy เทียบค่าเฉลี่ย 3 ปี
  const order = ["09", "10", "11", "12", "01", "02", "03", "04", "05"];
  const mm = today.slice(5, 7), dd = +today.slice(8, 10), idx = order.indexOf(mm);
  let pace = "";
  if (idx >= 0) {
    const end = CFG.ihappyAvgCumulative[mm], prevEnd = idx ? CFG.ihappyAvgCumulative[order[idx - 1]] : 0;
    const dim = new Date(+today.slice(0, 4), +mm, 0).getDate();
    const avg = prevEnd + ((end - prevEnd) * dd) / dim;
    const cur = okJobs.filter((j) => j.site === "iHappy").length;
    pace = `\n📈 iHappy ปีนี้ ${cur} งาน เทียบค่าเฉลี่ย 3 ปี ณ วันนี้ ~${Math.round(avg)} งาน (${Math.round((cur / avg) * 100)}%)`;
  }

  // ความเร็วที่งานเต็ม (เฉพาะงานที่เราเห็นตั้งแต่เปิดและเห็นตอนเต็มจริง)
  const done = jobsAll.filter((x) => x.tracked && x.fullAt);
  const days = (x) => (Date.parse(x.fullAt) - Date.parse(x.first)) / DAY;
  const avgD = (a) => (a.length ? (a.reduce((s, x) => s + days(x), 0) / a.length).toFixed(1) : null);
  const favDone = done.filter((x) => x.f);
  const speed = `\n⏱ ความเร็วที่งานเต็ม (เก็บตั้งแต่เริ่มระบบ): เต็มแล้ว ${done.length} งาน` +
    (done.length ? ` เฉลี่ย ${avgD(done)} วัน` : "") +
    (favDone.length ? ` | งานสำคัญ ${favDone.length} งาน เฉลี่ย ${avgD(favDone)} วัน` : "") +
    `\n♻️ ที่ว่างหลุดกลับมา 7 วันที่ผ่านมา: ${state.events.filter((e) => Date.parse(e.at) > Date.now() - 7 * DAY).length} ครั้ง`;

  const daily = [
    `🌅 สรุปประจำวัน ${today}\n\n🆕 งานใหม่ใน 24 ชม.: Acadex ${newBy("Acadex")} | iHappy ${newBy("iHappy")} | New Step ${newBy("New Step")}\n📋 ตอนนี้: Acadex ${cnt("Acadex")} | iHappy ${cnt("iHappy")} | New Step ${cnt("New Step")}${pace}${speed}`,
  ];
  if (favOpen.length) {
    daily.push(`⭐ งานสำคัญที่ยังเปิดอยู่ ${favOpen.length} งาน\n\n${favOpen.slice(0, 10).map((j) => fmt(j)).join("\n\n")}${favOpen.length > 10 ? `\n\n…และอีก ${favOpen.length - 10} งาน` : ""}`);
  }
  const due = [];
  for (const d of CFG.deadlines) {
    const left = Math.round((Date.parse(d.date) - Date.parse(today)) / DAY);
    const id = `${d.date}:${left}`;
    if ([3, 1, 0].includes(left) && !state.reminders[id]) {
      state.reminders[id] = true;
      due.push(`• ${left === 0 ? "วันนี้" : `อีก ${left} วัน`}: ${d.label} (${d.date})`);
    }
  }
  if (due.length) daily.push(`⏰ เตือนวันสำคัญ\n\n${due.join("\n")}`);
  outbox.push(...daily);
}

if (outbox.length) await pushMany(outbox);
console.log(`ส่งแล้ว ${outbox.length} ข้อความ (งานใหม่ ${fresh.length}, ที่ว่างกลับมา ${reopened.length})`);

mkdirSync(".job-watch", { recursive: true });
writeFileSync(STATE, JSON.stringify(state));
