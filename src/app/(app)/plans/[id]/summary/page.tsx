import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { PlanProgress } from "@/components/plan-progress";
import { BrandLogo } from "@/components/brand-logo";
import { ReportActions } from "@/components/plan/report-actions";
import { SectionSummary } from "@/components/plan/section-summary";
import { SECTIONS } from "@/lib/form-schema";
import { normalizeSection } from "@/lib/form-logic";
import { fullJson, fullMd } from "@/lib/export-md";
import { requireUser } from "@/lib/plan";
import { asStatus, STATUS_TEXT } from "@/lib/plan-status";
import { StatusPill } from "@/components/status-pill";

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

  const md = fullMd(
    items.map((i) => ({ section: i.section, data: i.data, status: i.status })),
    company,
    today,
  );
  const json = fullJson(
    items.map((i) => ({ section: i.section, data: i.data, status: i.status })),
    new Date().toISOString(),
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link
        href={`/plans/${id}`}
        className="flex h-11 w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground md:h-9 print:hidden"
      >
        <ChevronLeft className="size-4" />
        กลับไปกรอกแผน
      </Link>

      <section className="space-y-6 rounded-[14px] border bg-card p-4 md:p-8 print:hidden">
        <header className="space-y-1">
          <p className="font-latin text-xs font-semibold tracking-[0.12em] text-ring uppercase dark:text-gold">ขั้นสุดท้าย</p>
          <h1 className="text-2xl leading-tight font-bold">
            สรุปและส่งออก <span className="font-latin ml-1.5 text-[15px] font-medium text-muted-foreground">Summary &amp; Export</span>
          </h1>
          <p className="max-w-[80ch] pt-1 text-[14.5px] text-muted-foreground">
            ตรวจสถานะทุกหัวข้อ แล้วคัดลอกหรือดาวน์โหลดแผนธุรกิจทั้งฉบับ หัวข้อที่ยังไม่ยืนยันจะถูกระบุว่าเป็นฉบับร่าง
          </p>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((i) => (
            <Link
              key={i.section.id}
              href={`/plans/${id}?s=${i.section.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-[10px] border bg-card px-4 py-3 text-left transition-colors hover:border-ring"
            >
              <span className="min-w-0 text-[15px]">
                {i.section.no}. {i.section.th}
              </span>
              {i.status !== "empty" && <StatusPill status={i.status} />}
            </Link>
          ))}
        </div>

        <ReportActions
          items={items.map((i) => ({ id: i.section.id, data: i.data, status: i.status }))}
          company={company}
          dateText={today}
          md={md}
          json={json}
        />

        <pre className="max-h-[480px] overflow-auto rounded-[10px] bg-muted p-6 text-sm leading-relaxed whitespace-pre-wrap">{md}</pre>
      </section>

      <details className="rounded-[14px] border bg-card p-4 md:p-6 print:border-0 print:p-0">
        <summary className="cursor-pointer text-[15px] font-semibold print:hidden">ดูตัวอย่างหน้ารีพอร์ต (ตรงกับไฟล์ PDF)</summary>
        <div className="mt-6 space-y-6">
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
      </details>
    </div>
  );
}
