import "server-only";
import { GoogleGenAI } from "@google/genai";

export type AiErrorCode = "no_key" | "bad_key" | "rate" | "blocked" | "timeout" | "empty" | "unknown";

/** ข้อความภาษาไทยที่แสดงให้ผู้ใช้เห็น (ห้ามโชว์ error ดิบ) */
export const AI_ERROR_TEXT: Record<AiErrorCode, string> = {
  no_key: "ยังไม่ได้ตั้งค่า AI ในระบบ แจ้งผู้ดูแลระบบให้ใส่คีย์ Gemini ก่อน",
  bad_key: "คีย์ AI ใช้ไม่ได้ แจ้งผู้ดูแลระบบให้ตรวจคีย์ Gemini",
  rate: "AI ถูกเรียกใช้บ่อยเกินไปในตอนนี้ รอสักครู่แล้วลองใหม่",
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

const TIMEOUT_MS = 55_000;

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

/** เรียก Gemini ให้ตอบเป็น JSON (ถ้ามี schema จะบังคับรูปแบบ) */
export async function generateJson(prompt: string, schema?: object): Promise<unknown> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new AiError("no_key");
  const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: TIMEOUT_MS } });

  try {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        ...(schema ? { responseJsonSchema: schema } : {}),
      },
    });
    if (res.promptFeedback?.blockReason) throw new AiError("blocked");
    const finish = res.candidates?.[0]?.finishReason;
    const text = res.text;
    if (!text) throw new AiError(finish === "SAFETY" || finish === "PROHIBITED_CONTENT" ? "blocked" : "empty");
    return parseJson(text);
  } catch (e) {
    if (e instanceof AiError) throw e;
    const status = (e as { status?: number }).status;
    const msg = e instanceof Error ? e.message : "";
    if (status === 429) throw new AiError("rate");
    if (status === 401 || status === 403 || /API key/i.test(msg)) throw new AiError("bad_key");
    if (status === 408 || status === 504 || (e instanceof Error && (e.name === "AbortError" || /timed? ?out/i.test(msg)))) {
      throw new AiError("timeout");
    }
    throw new AiError("unknown");
  }
}
