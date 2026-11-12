import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PlanProgress } from "@/components/plan-progress";
import { BrandLogo } from "@/components/brand-logo";
import { ReportActions } from "@/components/plan/report-actions";
import { SectionSummary } from "@/components/plan/section-summary";
import { SECTIONS } from "@/lib/form-schema";
import { normalizeSection } from "@/lib/form-logic";
import { requireUser } from "@/lib/plan";
import { asStatus, STATUS_TEXT } from "@/lib/plan-status";

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
  const rawName = items[0].data.name;
  const company = typeof rawName === "string" ? rawName.trim() : "";
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
          <ReportActions
            items={items.map((i) => ({ id: i.section.id, data: i.data, status: i.status }))}
            company={company}
            dateText={today}
          />
        </div>
      </div>

      <header className="space-y-4 border-b pb-6">
        <BrandLogo height={36} />
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">รีพอร์ตแผนธุรกิจและแผนบุคลากร · AI-ANNA Business Blueprint</p>
          <h1 className="text-2xl font-semibold md:text-3xl">{company || "บริษัท (ยังไม่ระบุชื่อ)"}</h1>
          <p className="text-sm text-muted-foreground">จัดทำเมื่อ {today}</p>
        </div>
        <div className="print:hidden">
          <PlanProgress statuses={items.map((i) => i.status)} total={SECTIONS.length} />
        </div>
        <ol className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          {items.map((i) => (
            <li key={i.section.id} className="flex items-baseline gap-2">
              <span className="w-6 shrink-0 text-right text-muted-foreground tabular-nums">{i.section.no}.</span>
              <span className="min-w-0 flex-1">{i.section.th}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{STATUS_TEXT[i.status]}</span>
            </li>
          ))}
        </ol>
      </header>

      <div className="space-y-4">
        {items.map((i) => (
          <SectionSummary key={i.section.id} section={i.section} data={i.data} status={i.status} company={company} />
        ))}
      </div>
    </div>
  );
}
