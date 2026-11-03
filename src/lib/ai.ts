import "server-only";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

export type AiErrorCode = "no_key" | "bad_key" | "rate" | "busy" | "blocked" | "timeout" | "empty" | "unknown";

/** ข้อความภาษาไทยที่แสดงให้ผู้ใช้เห็น (ห้ามโชว์ error ดิบ) */
export const AI_ERROR_TEXT: Record<AiErrorCode, string> = {
  no_key: "ยังไม่ได้ตั้งค่า AI ในระบบ แจ้งผู้ดูแลระบบให้ใส่คีย์ Gemini ก่อน",
  bad_key: "คีย์ AI ใช้ไม่ได้ แจ้งผู้ดูแลระบบให้ตรวจคีย์ Gemini",
  rate: "AI ถูกเรียกใช้บ่อยเกินไปในตอนนี้ รอสักครู่แล้วลองใหม่",
  busy: "AI กำลังมีผู้ใช้งานจำนวนมาก ลองกดอีกครั้งในอีกสักครู่",
  blocked: "AI ปฏิเสธที่จะตอบเนื้อหานี้ ลองปรับความต้องการเพิ่มเติมแล้วลองใหม่",
  timeout: "AI ใช้เวลานานเกินไป ลองกดอีกครั้ง",
  empty: "AI ตอบกลับมาแต่ไม่มีข้อมูลที่ใช้ได้ ลองกดอีกครั้งหรือปรับความต้องการเพิ่มเติม",
  unknown: "สร้างไม่สำเร็จ ลองกดอีกครั้ง",
};

export class AiError extends Error {
  constructor(public code: AiErrorCode) {
    super(code);
  }
}

// ต่อหนึ่งครั้งที่เรียก (มี 2 ครั้ง: รุ่นหลัก แล้วรุ่นสำรอง) ให้รวมไม่เกินเวลาของฟังก์ชัน (120 วินาที)
const TIMEOUT_MS = 50_000;

function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AiError("empty");
  }
}

/** รุ่นสำรอง ใช้เมื่อรุ่นหลักยุ่งหรือเรียกไม่ได้ชั่วคราว */
const STABLE_MODEL = "gemini-3.6-flash";
const NEWEST_MODEL = "gemini-3.8-flash";

async function callModel(ai: GoogleGenAI, model: string, prompt: string, schema?: object) {
  const res = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      // คิดน้อยลงเพื่อให้ตอบเร็ว (งานร่างแผนไม่ต้องใช้การให้เหตุผลลึก)
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      ...(schema ? { responseJsonSchema: schema } : {}),
    },
  });
  if (res.promptFeedback?.blockReason) throw new AiError("blocked");
  const finish = res.candidates?.[0]?.finishReason;
  const text = res.text;
  if (!text) throw new AiError(finish === "SAFETY" || finish === "PROHIBITED_CONTENT" ? "blocked" : "empty");
  return parseJson(text);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** เรียก Gemini ให้ตอบเป็น JSON (ถ้ามี schema จะบังคับรูปแบบ) ลองใหม่และสลับไปรุ่นสำรองเมื่อยุ่ง */
export async function generateJson(prompt: string, schema?: object): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("no_key");
  // รุ่นเสถียรเป็นรุ่นหลัก รุ่นใหม่สุดเป็นสำรอง (รุ่นใหม่สุดมักยุ่งหรือตอบช้า)
  const primary = process.env.GEMINI_MODEL || STABLE_MODEL;
  const models = [primary, primary === STABLE_MODEL ? NEWEST_MODEL : STABLE_MODEL];
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });

  let last: AiError = new AiError("unknown");
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await callModel(ai, model, prompt, schema);
    } catch (e) {
      if (e instanceof AiError) throw e;
      const status = (e as { status?: number }).status;
      const msg = e instanceof Error ? e.message : "";
      // บันทึกสาเหตุจริงไว้ใน log ฝั่งเซิร์ฟเวอร์ (ผู้ใช้เห็นเฉพาะข้อความไทย)
      console.error("[ai] generateContent failed", { model, status, name: e instanceof Error ? e.name : typeof e, msg: msg.slice(0, 300) });
      if (status === 401 || status === 403 || /API key/i.test(msg)) throw new AiError("bad_key");
      const timedOut = status === 408 || status === 504 || (e instanceof Error && (e.name === "AbortError" || /timed? ?out/i.test(msg)));
      last = new AiError(status === 429 ? "rate" : status === 503 ? "busy" : timedOut ? "timeout" : "unknown");
      // ลองใหม่เฉพาะกรณีที่ปลายทางยุ่งหรือเรียกไม่ติดชั่วคราว
      if (!(status === 503 || status === 429 || status === 500 || status === 404 || timedOut)) throw last;
      if (i < models.length - 1) await sleep(500);
    }
  }
  throw last;
}
