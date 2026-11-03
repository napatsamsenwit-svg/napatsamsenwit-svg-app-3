/**
 * Prompt ของ AI พอร์ตจากต้นฉบับ (buildPrompt / cellPrompt) ข้อความคำสั่งคงตามเดิม
 * ใช้ร่วมกับ `guide` ของแต่ละหัวข้อใน form-schema.ts
 */
import { DEFAULT_CONTEXT, SECTIONS, SECTION_BY_ID, type Col, type Field, type Section } from "@/lib/form-schema";
import { isFilled, sectionMd, type Row, type SectionData } from "@/lib/form-logic";
import type { DictEntry } from "@/lib/competency";

const str = (v: unknown) => (v == null ? "" : String(v));

type Prim = "text" | "textarea" | "select" | "number";

function propSchema(c: Pick<Col, "type" | "options" | "label">): object {
  if (c.type === "select" && c.options?.length) return { type: "string", enum: c.options, description: c.label };
  return { type: "string", description: c.label };
}

/** JSON schema ของผลลัพธ์ (บังคับรูปแบบผ่าน structured output ของ Gemini) */
export function buildSchema(s: Section): object {
  const properties: Record<string, object> = {};
  const used: string[] = [];
  s.fields.forEach((f) => {
    if (f.noAI || f.type === "cmpEdits") return;
    used.push(f.k);
    if (f.type === "list") properties[f.k] = { type: "array", items: { type: "string" }, description: f.label };
    else if (f.type === "table") {
      const cols = f.cols ?? [];
      properties[f.k] = {
        type: "array",
        items: {
          type: "object",
          properties: Object.fromEntries(cols.map((c) => [c.k, propSchema(c)])),
          required: cols.map((c) => c.k),
        },
        description: f.label,
      };
    } else properties[f.k] = propSchema(f as { type: Prim; options?: string[]; label: string });
  });
  // หัวข้อที่เติมเฉพาะช่องว่าง: ส่งคืนเฉพาะช่องที่ผู้ใช้ยังไม่กรอก จึงไม่บังคับทุกคีย์
  return { type: "object", properties, ...(s.fillEmptyOnly ? {} : { required: used }) };
}

/** โครงสร้างที่ให้ AI ดูใน prompt (เหมือนต้นฉบับ) */
export function shapeOf(s: Section) {
  const o: Record<string, unknown> = {};
  s.fields.forEach((f) => {
    if (f.noAI || f.type === "cmpEdits") return;
    const d = (c: { type: string; options?: string[]; label: string }) =>
      c.type === "select"
        ? "เลือกหนึ่งค่า: " + (c.options ?? []).join(" | ")
        : c.type === "number"
          ? "ตัวเลข"
          : "ข้อความ: " + c.label;
    if (f.type === "list") o[f.k] = ["ข้อความ: " + f.label];
    else if (f.type === "table") o[f.k] = [Object.fromEntries((f.cols ?? []).map((c) => [c.k, d(c)]))];
    else o[f.k] = d(f);
  });
  return o;
}

export type PlanData = Record<string, SectionData>;

function companyContext(data: PlanData) {
  const company = SECTION_BY_ID.company;
  return isFilled(company, data.company) ? sectionMd(company, data.company) : DEFAULT_CONTEXT;
}

export function buildSectionPrompt(s: Section, data: PlanData, req: string): string {
  const company = SECTION_BY_ID.company;
  const companyFilled = isFilled(company, data.company);
  let ctx: string;
  if (s.id === "company") {
    ctx =
      DEFAULT_CONTEXT +
      (companyFilled
        ? "\n\nข้อมูลที่ผู้ใช้กรอกไว้แล้ว (ห้ามเปลี่ยน ให้เติมเฉพาะช่องที่ว่าง):\n" + JSON.stringify(data.company, null, 1)
        : "");
  } else {
    ctx = companyContext(data);
  }
  const others = SECTIONS.filter((x) => x.id !== s.id && x.id !== "company" && isFilled(x, data[x.id]))
    .map((x) => sectionMd(x, data[x.id]))
    .join("\n\n")
    .slice(0, 60000);
  return `คุณคือที่ปรึกษาด้านกลยุทธ์ธุรกิจและการบริหารทรัพยากรบุคคลในประเทศไทย กำลังช่วยผู้ใช้จัดทำแผนธุรกิจบนระบบ ANNA HR
งานของคุณ: ร่างเนื้อหาหัวข้อ "${s.no}. ${s.th} (${s.en})"

# บริบทบริษัท
${ctx}

# หัวข้ออื่นที่ผู้ใช้กรอกไว้ (เขียนให้สอดคล้องกัน)
${others || "(ยังไม่มี)"}

# ความต้องการของผู้ใช้สำหรับหัวข้อนี้ (สำคัญที่สุด ทำตามก่อนข้ออื่น)
${req.trim() || "(ไม่มี)"}

# แนวทางของหัวข้อนี้
${s.guide}

# รูปแบบคำตอบ
ตอบเป็น JSON object เดียวเท่านั้น ไม่มีข้อความอื่นหรือ code fence ใช้คีย์ตามโครงสร้างนี้เท่านั้น:
${JSON.stringify(shapeOf(s), null, 1)}
- เขียนเป็นภาษาไทย ใช้ศัพท์เทคนิคภาษาอังกฤษได้
- ช่องที่เป็นตัวเลือก ต้องใช้ค่าจากตัวเลือกที่ให้ไว้ตรงตัวอักษร
- ตัวเลขเป้าหมายเป็นค่าตัวอย่างที่สมเหตุสมผลกับขนาดและประเภทธุรกิจนี้`;
}

/** หัวข้อ Key Competency: ให้ AI เลือกจากพจนานุกรมของบริษัท แล้วระบบคัดลอกข้อความตรงตัว */
export function buildCompetencyPrompt(data: PlanData, dict: DictEntry[], req: string): string {
  const s = SECTION_BY_ID.competency;
  const others = SECTIONS.filter((x) => x.id !== s.id && x.id !== "company" && isFilled(x, data[x.id]))
    .map((x) => sectionMd(x, data[x.id]))
    .join("\n\n")
    .slice(0, 60000);
  const list = dict.map((c) => `${c.id} | ${c.type}${c.gth ? " / " + c.gth : ""} | ${c.name}`).join("\n");
  return `คุณคือที่ปรึกษาด้านกลยุทธ์ธุรกิจและการบริหารทรัพยากรบุคคลในประเทศไทย กำลังช่วยผู้ใช้จัดทำแผนธุรกิจบนระบบ ANNA HR
งานของคุณ: เลือกสมรรถนะสำหรับหัวข้อ "${s.no}. ${s.th} (${s.en})" จากพจนานุกรมสมรรถนะของบริษัท

# บริบทบริษัท
${companyContext(data)}

# หัวข้ออื่นที่ผู้ใช้กรอกไว้ (เลือกให้สอดคล้องกัน)
${others || "(ยังไม่มี)"}

# ความต้องการของผู้ใช้สำหรับหัวข้อนี้ (สำคัญที่สุด ทำตามก่อนข้ออื่น)
${req.trim() || "(ไม่มี)"}

# แนวทางของหัวข้อนี้
${s.guide}

# พจนานุกรมสมรรถนะ (รหัส | ประเภท | ชื่อ) เลือกได้เฉพาะรหัสในรายการนี้
${list}

# รูปแบบคำตอบ
ตอบเป็น JSON object เดียวเท่านั้น ไม่มีข้อความอื่นหรือ code fence: {"rows":[{"id":"รหัสจากรายการ","level":"1-5 ระดับที่คาดหวัง"}]}
- เลือก 8–14 รายการ ไม่ซ้ำกัน และห้ามใช้รหัสที่ไม่อยู่ในรายการ`;
}

export function competencySchema(dict: DictEntry[]): object {
  return {
    type: "object",
    properties: {
      rows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string", enum: dict.map((c) => c.id) },
            level: { type: "string", enum: ["1", "2", "3", "4", "5"] },
          },
          required: ["id", "level"],
        },
      },
    },
    required: ["rows"],
  };
}

export function buildCellPrompt(s: Section, f: Field, c: Col, row: Row, data: PlanData, req: string): string {
  const me = (f.cols ?? [])
    .filter((x) => x.k !== c.k)
    .map((x) => `${x.label}: ${str(row[x.k]).trim() || "-"}`)
    .join("\n");
  return `คุณคือที่ปรึกษาด้านกลยุทธ์ธุรกิจและการบริหารทรัพยากรบุคคลในประเทศไทย กำลังช่วยผู้ใช้จัดทำแผนธุรกิจบนระบบ ANNA HR
งานของคุณ: เขียนช่อง "${c.label}" ของแถวเดียวในหัวข้อ "${s.no}. ${s.th} (${s.en})"

# บริบทบริษัท
${companyContext(data)}

# ข้อมูลทั้งหมดในหัวข้อนี้ (เขียนให้สอดคล้องและไม่ซ้ำกับแถวอื่น)
${sectionMd(s, data[s.id] ?? {})}

# แถวที่ต้องเขียน
${me}

# ความต้องการของผู้ใช้สำหรับหัวข้อนี้
${req.trim() || "(ไม่มี)"}

# รูปแบบคำตอบ
ตอบเป็น JSON object เดียวเท่านั้น ไม่มีข้อความอื่นหรือ code fence: {"${c.k}": "ข้อความ"}
- เขียนเป็นภาษาไทย ใช้ศัพท์เทคนิคภาษาอังกฤษได้
- ความยาวและรูปแบบใกล้เคียงกับช่อง "${c.label}" ของแถวอื่นที่กรอกไว้แล้ว ถ้ายังไม่มี ให้เขียน 1–2 ประโยค
- เขียนเฉพาะสิ่งที่สอดคล้องกับข้อมูลของแถวนี้และบริบทบริษัท`;
}
