"use client";

import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TAB_FLAG } from "@/lib/session-marker";
import { logout, verifyMfa } from "../actions";

export default function MfaPage() {
  const [state, action, pending] = useActionState(verifyMfa, null);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <BrandLogo height={40} priority />
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="size-6" />
            ยืนยันตัวตน 2 ชั้น
          </h1>
          <p className="text-sm text-muted-foreground">เปิดแอปยืนยันตัวตนในมือถือ (เช่น Google Authenticator) แล้วใส่รหัส 6 หลัก</p>
        </div>
        <form
          action={action}
          autoComplete="off"
          className="space-y-4"
          onSubmit={() => {
            try {
              sessionStorage.setItem(TAB_FLAG, "1");
            } catch {
              /* ไม่มี sessionStorage: ใช้เฉพาะคุกกี้เซสชัน */
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="code">รหัส 6 หลัก</Label>
            <Input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              required
              autoFocus
              className="h-12 text-center text-xl tracking-[0.4em]"
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          <Button type="submit" className="h-11 w-full text-base" disabled={pending}>
            {pending ? "รอสักครู่…" : "ยืนยัน"}
          </Button>
        </form>
        <form action={logout} className="text-center">
          <button type="submit" className="text-sm text-muted-foreground underline underline-offset-4">
            กลับไปหน้าเข้าสู่ระบบ
          </button>
        </form>
      </div>
    </main>
  );
}
