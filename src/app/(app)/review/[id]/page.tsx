import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { ReviewerView } from "@/components/plan/reviewer-view";
import type { ReviewItem } from "@/components/plan/plan-editor";
import { isReviewerUser, requireUser } from "@/lib/plan";

export default async function ReviewPlanPage({ params }: PageProps<"/review/[id]">) {
  const { id } = await params;
  if (!(await isReviewerUser())) redirect("/");
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
  if (plan.data.user_id === userId) redirect(`/plans/${id}`);

  const owner = await supabase.from("profiles").select("email, display_name").eq("user_id", plan.data.user_id).maybeSingle();
  const initial = Object.fromEntries((sections.data ?? []).map((s) => [s.section_key, { data: s.data, status: s.status }]));
  const byKey: Record<string, ReviewItem[]> = {};
  (reviews.data ?? []).forEach((r) => {
    (byKey[r.section_key] ??= []).push({ action: r.action, note: r.note, created_at: r.created_at });
  });

  return (
    <Suspense>
      <ReviewerView
        planId={plan.data.id}
        title={`${plan.data.title}${owner.data?.email ? ` · ${owner.data.email}` : ""}`}
        initial={initial}
        reviews={byKey}
      />
    </Suspense>
  );
}
