import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanProgress } from "@/components/plan-progress";
import { StatusPill } from "@/components/status-pill";
import { Card } from "@/components/ui/card";
import { SECTIONS } from "@/lib/form-schema";
import { requireUser } from "@/lib/plan";
import { asStatus } from "@/lib/plan-status";

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const [plan, sections] = await Promise.all([
    supabase.from("plans").select("id, title").eq("id", id).maybeSingle(),
    supabase.from("plan_sections").select("section_key, status").eq("plan_id", id),
  ]);
  if (!plan.data) notFound();

  const statusByKey = new Map((sections.data ?? []).map((s) => [s.section_key, asStatus(s.status)]));
  const statuses = SECTIONS.map((s) => statusByKey.get(s.id) ?? "empty");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">{plan.data.title}</h1>
        <p className="text-sm text-muted-foreground">พิมพ์เขียวธุรกิจ 13 หัวข้อ เลือกหัวข้อเพื่อเริ่มกรอก</p>
      </div>
      <Card className="p-4 md:p-5">
        <PlanProgress statuses={statuses} total={SECTIONS.length} />
      </Card>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s, i) => (
          <li key={s.id}>
            <Link
              href={`/plans/${id}?s=${s.id}`}
              className="flex min-h-16 items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:bg-accent"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-semibold text-primary-foreground tabular-nums">
                {String(s.no).padStart(2, "0")}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{s.th}</span>
                <span className="block truncate text-xs text-muted-foreground">{s.en}</span>
              </span>
              <StatusPill status={statuses[i]} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
