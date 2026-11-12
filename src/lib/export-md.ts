import { isFilled, sectionMd, type SectionData } from "@/lib/form-logic";
import type { Section } from "@/lib/form-schema";
import { STATUS_TEXT, type SectionStatus } from "@/lib/plan-status";

export type MdItem = { section: Section; data: SectionData; status: SectionStatus };

const draftText = (st: SectionStatus) => (st === "approved" || st === "review" || st === "returned" ? STATUS_TEXT[st] : "ฉบับร่าง");

/** แผนทั้งฉบับเป็นข้อความ Markdown (หัวข้อที่ยังไม่ยืนยันระบุว่าเป็นฉบับร่าง) */
export function fullMd(items: MdItem[], company: string, dateText: string): string {
  const name = company.trim() || "บริษัท (ยังไม่ระบุชื่อ)";
  return (
    `# แผนธุรกิจ: ${name}\n\nจัดทำด้วยฟอร์มวางแผนธุรกิจ ANNA HR · ${dateText}\n\n` +
    items
      .map((i) =>
        isFilled(i.section, i.data)
          ? sectionMd(i.section, i.data, draftText(i.status))
          : `## ${i.section.no}. ${i.section.th} (${i.section.en})\n\n_(ยังไม่ได้กรอก)_`,
      )
      .join("\n\n---\n\n") +
    "\n"
  );
}

/** แผนทั้งฉบับเป็น JSON เหมาะนำเข้าระบบอื่น */
export function fullJson(items: MdItem[], exportedAt: string): string {
  const sections: Record<string, unknown> = {};
  items.forEach((i) => {
    const data: Record<string, unknown> = {};
    i.section.fields.forEach((f) => {
      data[f.k] = i.data[f.k];
    });
    if (i.section.layout === "fishbone") data.cats = i.data.cats;
    sections[i.section.id] = {
      no: i.section.no,
      title: i.section.th,
      title_en: i.section.en,
      status: i.status,
      confirmed: i.status === "approved",
      data,
    };
  });
  return JSON.stringify({ app: "ANNA HR Business Plan Form", schema: "biz_form_v1", exported_at: exportedAt, sections }, null, 2);
}
