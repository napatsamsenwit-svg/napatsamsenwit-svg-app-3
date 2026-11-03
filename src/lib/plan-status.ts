export type SectionStatus = "empty" | "filling" | "review" | "approved" | "returned";

export const STATUS_TEXT: Record<SectionStatus, string> = {
  empty: "ยังว่าง",
  filling: "กำลังกรอก",
  review: "รอตรวจ",
  approved: "อนุมัติแล้ว",
  returned: "ส่งกลับแก้",
};

/** สีของป้ายสถานะ ใช้ token เท่านั้น */
export const STATUS_CLASS: Record<SectionStatus, string> = {
  empty: "bg-muted text-muted-foreground",
  filling: "bg-gold/40 text-foreground",
  review: "bg-primary text-primary-foreground",
  approved: "bg-ok-soft text-ok",
  returned: "bg-warn-soft text-warn",
};

export function asStatus(value: string | null | undefined): SectionStatus {
  return value === "filling" || value === "review" || value === "approved" || value === "returned"
    ? value
    : "empty";
}

/** นับความคืบหน้า: อนุมัติแล้ว / รอตรวจ / กรอกแล้ว (รวมทุกหัวข้อที่มีข้อมูล) */
export function countProgress(statuses: SectionStatus[], total: number) {
  const approved = statuses.filter((s) => s === "approved").length;
  const review = statuses.filter((s) => s === "review").length;
  const filled = statuses.filter((s) => s !== "empty").length;
  return { approved, review, filled, total };
}
