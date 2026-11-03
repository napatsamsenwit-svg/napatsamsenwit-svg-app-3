import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PlanProgress } from "@/components/plan-progress";
import { PrintButton } from "@/components/print-button";
import { SectionSummary } from "@/components/plan/section-summary";
import { SECTIONS } from "@/lib/form-schema";
import { normalizeSection } from "@/lib/form-logic";
import { requireUser } from "@/lib/plan";
import { asStatus } from "@/lib/plan-status";

export default async function SummaryPage({ params }: PageProps<"/plans/[id]/summary">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();

  const [plan, sections] = await Promise.all([
    supabase.from("plans").select("id, title, user_id").eq("id", id).maybeSingle(),
    supabase.from("plan_sections").select("section_key, data, status").eq("plan_id", id),
  ]);
  if (!plan.data) notFound();
  if (plan.data.user_id !== userId) redirect(`/review/${id}`);

  const byKey = new Map((sections.data ?? []).map((s) => [s.section_key, s]));
  const items = SECTIONS.map((s) => {
    const row = byKey.get(s.id);
    return { section: s, data: normalizeSection(s, row?.data), status: asStatus(row?.status) };
  });
  const company = items[0].data.name;
  const today = new Date().toLocaleDateString("th-TH", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center gap-3 print:hidden">
        <Link
          href={`/plans/${id}`}
          className="flex h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground md:h-9"
        >
          <ChevronLeft className="size-4" />
          กลับไปกรอกแผน
        </Link>
        <div className="ml-auto">
          <PrintButton />
        </div>
      </div>

      <header className="space-y-2">
        <p className="text-sm text-muted-foreground">ANNA HR · AI-ANNA Business Blueprint</p>
        <h1 className="text-2xl font-semibold">
          แผนธุรกิจ: {typeof company === "string" && company.trim() ? company : "บริษัท (ยังไม่ระบุชื่อ)"}
        </h1>
        <p className="text-sm text-muted-foreground">จัดทำเมื่อ {today}</p>
        <div className="print:hidden">
          <PlanProgress statuses={items.map((i) => i.status)} total={SECTIONS.length} />
        </div>
      </header>

      <div className="space-y-4">
        {items.map((i) => (
          <SectionSummary key={i.section.id} section={i.section} data={i.data} status={i.status} />
        ))}
      </div>
    </div>
  );
}
