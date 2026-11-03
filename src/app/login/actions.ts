"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error: string } | null;

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(readCredentials(formData));
  if (error) return { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" };
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
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
