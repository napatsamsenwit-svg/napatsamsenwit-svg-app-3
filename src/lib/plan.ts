import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** ผู้ใช้ที่ล็อกอินอยู่ (กลับไปหน้า login ถ้าไม่มี) */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) redirect("/login");
  return {
    supabase,
    userId: claims.sub,
    email: typeof claims.email === "string" ? claims.email : "",
  };
}

/** หนึ่งคนหนึ่งแผน: ถ้ายังไม่มีให้สร้างให้เลย */
export async function getOrCreateOwnPlan() {
  const { supabase, userId } = await requireUser();
  const existing = await supabase.from("plans").select("id").eq("user_id", userId).maybeSingle();
  if (existing.data) return existing.data.id;

  const created = await supabase.from("plans").insert({}).select("id").single();
  if (created.data) return created.data.id;

  // สองหน้าต่างสร้างพร้อมกัน: อีกฝั่งสร้างไปแล้ว อ่านซ้ำอีกครั้ง
  const again = await supabase.from("plans").select("id").eq("user_id", userId).maybeSingle();
  if (again.data) return again.data.id;
  throw new Error("สร้างแผนไม่สำเร็จ");
}

export async function isReviewerUser() {
  const { supabase } = await requireUser();
  const { data } = await supabase.rpc("is_reviewer");
  return data === true;
}
