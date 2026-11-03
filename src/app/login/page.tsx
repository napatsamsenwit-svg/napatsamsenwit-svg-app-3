"use client";

import { Suspense, useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardCheck, Eye, EyeOff, FileText, Lock, Mail, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NOT_ALLOWED_MESSAGE } from "@/lib/allowed-emails";
import { cn } from "@/lib/utils";
import { login, signup } from "./actions";

const FEATURES = [
  { icon: Sparkles, title: "AI ช่วยร่างให้ทุกหัวข้อ", text: "บอกความต้องการสั้น ๆ แล้วได้ร่างพร้อมแก้ต่อ" },
  {
    icon: ClipboardCheck,
    title: "ประเมิน KPI และสมรรถนะแบบ Real time",
    text: "ประเมิน 90° 180° 360° เชื่อมเป้าหมายองค์กรสู่รายบุคคล",
  },
  { icon: FileText, title: "ลดเวลาประเมินจาก 4 เดือน เหลือ 4 วัน", text: "ส่งตรวจ อนุมัติ และออกรายงานได้ในระบบเดียว" },
];

function BlockedNotice() {
  const blocked = useSearchParams().get("blocked") === "1";
  if (!blocked) return null;
  return (
    <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
      {NOT_ALLOWED_MESSAGE}
    </p>
  );
}

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loginState, loginAction, loginPending] = useActionState(login, null);
  const [signupState, signupAction, signupPending] = useActionState(signup, null);

  const isLogin = mode === "login";
  const state = isLogin ? loginState : signupState;
  const pending = isLogin ? loginPending : signupPending;

  return (
    <main className="grid min-h-full flex-1 lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-surface p-12 text-brand-surface-foreground lg:flex">
        <div aria-hidden className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-brand-violet/40 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute right-[-6rem] bottom-[-6rem] size-[28rem] rounded-full bg-brand-cyan/25 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/3 size-72 rounded-full bg-brand-blue/30 blur-3xl" />

        <div className="relative">
          <BrandLogo height={40} onDark priority />
        </div>

        <div className="relative max-w-lg space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl leading-snug font-semibold">ระบบ HR AI ครบวงจร</h2>
            <p className="text-lg leading-relaxed opacity-80">
              ตั้งแต่วางแผนธุรกิจ โครงสร้างองค์กร ไปจนถึงประเมิน KPI และสมรรถนะ ลดงานเอกสาร ลดเวลา และได้ข้อมูลไปตัดสินใจจริง
            </p>
          </div>
          <ul className="space-y-4">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block font-medium">{title}</span>
                  <span className="block text-sm opacity-70">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm opacity-70">by CSR Consulting Group</p>
      </aside>

      <section className="flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-6">
        <div className="flex flex-col items-center gap-2 text-center lg:hidden">
          <BrandLogo height={40} priority />
          <p className="text-sm text-muted-foreground">ระบบ HR AI ครบวงจร</p>
        </div>

        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{isLogin ? "เข้าสู่ระบบ Anna-AI" : "ลงทะเบียนใช้งาน Anna-AI"}</h1>
            <p className="text-sm text-muted-foreground">
              {isLogin ? "เข้าใช้งานระบบ HR AI สำหรับองค์กรของคุณ" : "สร้างบัญชีผู้ใช้งานเพื่อเริ่มใช้ระบบ HR AI"}
            </p>
          </div>

          <Suspense>
            <BlockedNotice />
          </Suspense>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="เลือกเข้าสู่ระบบหรือสมัครสมาชิก">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  "h-10 rounded-lg text-sm font-medium text-muted-foreground transition-colors",
                  mode === m && "bg-card text-foreground shadow-sm",
                )}
              >
                {m === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
              </button>
            ))}
          </div>

          <form action={isLogin ? loginAction : signupAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="เช่น somchai@company.co.th"
                  required
                  className="h-11 pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  placeholder={isLogin ? "รหัสผ่านของคุณ" : "อย่างน้อย 6 ตัว"}
                  minLength={6}
                  required
                  className="h-11 pr-11 pl-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                    minLength={6}
                    required
                    className="h-11 pl-9"
                  />
                </div>
              </div>
            )}
            {state?.error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
                {state.error}
              </p>
            )}
            <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
              {pending ? "รอสักครู่…" : isLogin ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "ยังไม่มีบัญชี? " : "มีบัญชีอยู่แล้ว? "}
            <button
              type="button"
              className="font-medium text-foreground underline underline-offset-4"
              onClick={() => setMode(isLogin ? "signup" : "login")}
            >
              {isLogin ? "สมัครสมาชิก" : "เข้าสู่ระบบ"}
            </button>
          </p>
        </div>

        <p className="text-xs text-muted-foreground lg:hidden">by CSR Consulting Group</p>
      </section>
    </main>
  );
}
