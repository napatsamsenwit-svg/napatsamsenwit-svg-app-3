"use server";

import { AI_ERROR_TEXT, AiError, generateJson } from "@/lib/ai";
import { buildCellPrompt, buildCompetencyPrompt, buildSchema, buildSectionPrompt, competencySchema, type PlanData } from "@/lib/ai-prompts";
import { competencyRow, type DictEntry } from "@/lib/competency";
import { isFilled, normalizeSection, type Row, type SectionData } from "@/lib/form-logic";
import { SECTIONS, SECTION_BY_ID } from "@/lib/form-schema";
import { requireUser } from "@/lib/plan";

/** โควตา AI ต่อคนต่อวัน (นับตามวันเวลาไทย) */
const DAILY_LIMIT = 100;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function startOfBangkokDay() {
  const offset = 7 * 60 * 60 * 1000;
  const local = new Date(Date.now() + offset);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - offset);
}

/** เช็กสิทธิ์ + โควตา + โหลดข้อมูลแผนจากฐานข้อมูล แล้วนับการใช้งานหนึ่งครั้ง */
async function prepare(planId: string): Promise<{ data: PlanData } | { error: string }> {
  if (!process.env.GEMINI_API_KEY) return { error: AI_ERROR_TEXT.no_key };
  const { supabase, userId } = await requireUser();

  const plan = await supabase.from("plans").select("id, user_id").eq("id", planId).maybeSingle();
  if (!plan.data || plan.data.user_id !== userId) return { error: "ไม่พบแผนนี้ หรือคุณไม่ใช่เจ้าของแผน" };

  const used = await supabase
    .from("ai_usage")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startOfBangkokDay().toISOString());
  if ((used.count ?? 0) >= DAILY_LIMIT) {
    return { error: `วันนี้ใช้ AI ครบ ${DAILY_LIMIT} ครั้งแล้ว พรุ่งนี้ใช้ได้ใหม่` };
  }

  const rows = await supabase.from("plan_sections").select("section_key, data").eq("plan_id", planId);
  const byKey = new Map((rows.data ?? []).map((r) => [r.section_key, r.data]));
  const data: PlanData = Object.fromEntries(SECTIONS.map((s) => [s.id, normalizeSection(s, byKey.get(s.id))]));

  await supabase.from("ai_usage").insert({});
  return { data };
}

function toError(e: unknown): string {
  return AI_ERROR_TEXT[e instanceof AiError ? e.code : "unknown"];
}

/** ร่างเนื้อหาทั้งหัวข้อ (ยังไม่บันทึก ให้ผู้ใช้ดูตัวอย่างก่อน) */
export async function generateSection(planId: string, sectionKey: string): Promise<Result<SectionData>> {
  const sec = SECTION_BY_ID[sectionKey];
  if (!sec) return fail("ไม่พบหัวข้อนี้");
  const prep = await prepare(planId);
  if ("error" in prep) return fail(prep.error);
  const req = prep.data[sectionKey]?._req ?? "";

  try {
    if (sec.dictOnly) {
      const dict = (await import("@/lib/data/competency-dict.json")).default as unknown as DictEntry[];
      const out = (await generateJson(buildCompetencyPrompt(prep.data, dict, req), competencySchema(dict))) as {
        rows?: { id?: string; level?: string }[];
      };
      const seen = new Set<string>();
      const rows: Row[] = [];
      (out?.rows ?? []).forEach((r) => {
        const c = dict.find((d) => d.id === r.id);
        if (!c || seen.has(c.id)) return;
        seen.add(c.id);
        const lv = Math.min(5, Math.max(1, parseInt(String(r.level), 10) || 3));
        rows.push(competencyRow(c, lv));
      });
      const clean = normalizeSection(sec, { rows });
      if (!isFilled(sec, clean)) throw new AiError("empty");
      return { ok: true, data: clean };
    }

    let out = await generateJson(buildSectionPrompt(sec, prep.data, req), buildSchema(sec));
    // ต้นฉบับยอมรับคำตอบที่ห่อมาอีกชั้น หรือเป็น array สำหรับหัวข้อที่มีช่องเดียว
    if (out && typeof out === "object" && !Array.isArray(out) && !sec.fields.some((f) => f.k in (out as object))) {
      const inner = Object.values(out as Record<string, unknown>).find((v) => v && typeof v === "object" && !Array.isArray(v));
      if (inner) out = inner;
    }
    if (Array.isArray(out) && sec.fields.length === 1) out = { [sec.fields[0].k]: out };
    const clean = normalizeSection(sec, out && typeof out === "object" ? out : {});
    if (!isFilled(sec, clean)) throw new AiError("empty");
    return { ok: true, data: clean };
  } catch (e) {
    return fail(toError(e));
  }
}

/** ร่างช่องเดียวของแถวในตาราง (ช่องที่ทำเครื่องหมาย ai: true) */
export async function generateCell(
  planId: string,
  sectionKey: string,
  fieldKey: string,
  colKey: string,
  row: Row,
): Promise<Result<string>> {
  const sec = SECTION_BY_ID[sectionKey];
  const field = sec?.fields.find((f) => f.k === fieldKey);
  const col = field?.cols?.find((c) => c.k === colKey);
  if (!sec || !field || !col || !col.ai) return fail("ช่องนี้ไม่มีปุ่ม AI");
  const prep = await prepare(planId);
  if ("error" in prep) return fail(prep.error);
  const req = prep.data[sectionKey]?._req ?? "";

  try {
    const out = (await generateJson(buildCellPrompt(sec, field, col, row, prep.data, req), {
      type: "object",
      properties: { [col.k]: { type: "string" } },
      required: [col.k],
    })) as Record<string, unknown>;
    const first = Object.values(out ?? {}).find((v) => typeof v === "string") as string | undefined;
    const text = String(out?.[col.k] ?? first ?? "").trim();
    if (!text) throw new AiError("empty");
    return { ok: true, data: text };
  } catch (e) {
    return fail(toError(e));
  }
}
