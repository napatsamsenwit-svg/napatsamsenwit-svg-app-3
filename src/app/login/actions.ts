"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LIVE_COOKIE } from "@/lib/session-marker";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

async function markLive() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_session_epoch");
  (await cookies()).set(LIVE_COOKIE, !error && typeof data === "string" ? data : "1", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
  // เปิด MFA ไว้: ต้องใส่รหัส 6 หลักจากแอปก่อน ถึงจะเข้าเว็บได้ (ยังไม่ตั้งคุกกี้ผ่านด่าน)
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") redirect("/login/mfa");
  await markLive();
  redirect("/");
}

export async function verifyMfa(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "ใส่รหัส 6 หลักจากแอปยืนยันตัวตน" };

  const supabase = await createClient();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp.find((f) => f.status === "verified");
  if (!factor) return { error: "หมดเวลาแล้ว กลับไปเข้าสู่ระบบใหม่อีกครั้ง" };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: factor.id, code });
  if (error) return { error: "รหัสไม่ถูกต้องหรือหมดอายุ ลองใหม่อีกครั้ง" };
  await markLive();
  redirect("/");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const credentials = readCredentials(formData);
  if (credentials.password.length < 6) return { error: "รหัสผ่านต้องยาวอย่างน้อย 6 ตัว" };
  if (credentials.password !== String(formData.get("confirmPassword") ?? "")) return { error: "รหัสผ่านทั้งสองช่องไม่ตรงกัน" };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp(credentials);
  if (error) {
    if (error.code === "user_already_exists") return { error: "อีเมลนี้สมัครไว้แล้ว ลองเข้าสู่ระบบแทน" };
    return { error: "สมัครไม่สำเร็จ ลองใหม่อีกครั้ง" };
  }
  if (!data.session) return { error: "ยังต้องปิด Confirm email ใน Supabase ก่อน (บอก Claude ได้เลย)" };
  await markLive();
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(LIVE_COOKIE);
  redirect("/login");
}

/** ผู้ตรวจกด "รีเซ็ตเว็บ": ทุกคนต้องล็อกอินใหม่ทันที (รวมถึงคนที่เปิดค้างอยู่) */
export async function resetAllSessions(): Promise<{ error: string }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("reset_all_sessions");
  if (error) return { error: "รีเซ็ตไม่สำเร็จ (เฉพาะผู้ตรวจเท่านั้น หรือฐานข้อมูลยังไม่ได้อัปเดต)" };
  await supabase.auth.signOut();
  (await cookies()).delete(LIVE_COOKIE);
  redirect("/login");
}
