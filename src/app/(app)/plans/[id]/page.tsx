import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PlanEditor, type ReviewItem } from "@/components/plan/plan-editor";
import { requireUser } from "@/lib/plan";

// AI อาจใช้เวลานาน (Server Action ของหน้านี้)
export const maxDuration = 60;

export default async function PlanPage({ params }: PageProps<"/plans/[id]">) {
  const { id } = await params;
  const { supabase, userId } = await requireUser();

  const [plan, sections, reviews] = await Promise.all([
    supabase.from("plans").select("id, title, user_id").eq("id", id).maybeSingle(),
    supabase.from("plan_sections").select("section_key, data, status").eq("plan_id", id),
    supabase
      .from("section_reviews")
      .select("section_key, action, note, created_at")
      .eq("plan_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!plan.data) notFound();

  const initial = Object.fromEntries((sections.data ?? []).map((s) => [s.section_key, { data: s.data, status: s.status }]));
  const byKey: Record<string, ReviewItem[]> = {};
  (reviews.data ?? []).forEach((r) => {
    (byKey[r.section_key] ??= []).push({ action: r.action, note: r.note, created_at: r.created_at });
  });

  return (
    <Suspense>
      <PlanEditor
        planId={plan.data.id}
        title={plan.data.title}
        mode={plan.data.user_id === userId ? "owner" : "reviewer"}
        initial={initial}
        reviews={byKey}
      />
    </Suspense>
  );
}
