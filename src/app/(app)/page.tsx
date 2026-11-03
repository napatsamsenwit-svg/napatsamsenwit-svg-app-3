import { redirect } from "next/navigation";
import { getOrCreateOwnPlan } from "@/lib/plan";

// หนึ่งคนหนึ่งแผน: เข้าหน้าแรกแล้วพาไปแผนของตัวเองเลย
export default async function Home() {
  const planId = await getOrCreateOwnPlan();
  redirect(`/plans/${planId}`);
}
