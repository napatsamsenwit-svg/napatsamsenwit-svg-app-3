import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, ClipboardCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SECTION_BY_ID } from "@/lib/form-schema";
import { isReviewerUser, requireUser } from "@/lib/plan";

export default async function ReviewQueuePage() {
  if (!(await isReviewerUser())) redirect("/");
  const { supabase } = await requireUser();

  const { data: queue } = await supabase
    .from("plan_sections")
    .select("plan_id, section_key, submitted_at, user_id, plans(title)")
    .eq("status", "review")
    .order("submitted_at", { ascending: true });

  const ids = [...new Set((queue ?? []).map((q) => q.user_id))];
  const profiles = ids.length
    ? (await supabase.from("profiles").select("user_id, email, display_name").in("user_id", ids)).data ?? []
    : [];
  const who = new Map(profiles.map((p) => [p.user_id, p.display_name || p.email || "ไม่ระบุชื่อ"]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ตรวจแผน</h1>
        <p className="text-sm text-muted-foreground">หัวข้อที่ส่งมารอตรวจ เรียงจากส่งก่อนไปหลัง</p>
      </div>

      {(queue ?? []).length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-8 text-center">
          <ClipboardCheck className="size-10 text-muted-foreground" />
          <p>ตอนนี้ไม่มีหัวข้อรอตรวจ เมื่อมีคนส่งตรวจ รายการจะมาอยู่ที่นี่</p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {(queue ?? []).map((q) => {
            const sec = SECTION_BY_ID[q.section_key];
            return (
              <li key={`${q.plan_id}-${q.section_key}`}>
                <Link
                  href={`/review/${q.plan_id}?s=${q.section_key}`}
                  className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                    {sec ? String(sec.no).padStart(2, "0") : "?"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{sec?.th ?? q.section_key}</span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {q.plans?.title ?? "แผนธุรกิจ"} · {who.get(q.user_id) ?? "ไม่ระบุชื่อ"}
                      {q.submitted_at
                        ? ` · ส่งเมื่อ ${new Date(q.submitted_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}`
                        : ""}
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
