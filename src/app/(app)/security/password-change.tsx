"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export function PasswordChange() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) return setError("รหัสผ่านต้องยาวอย่างน้อย 6 ตัว");
    if (password !== confirm) return setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
    setBusy(true);
    const { error: err } = await createClient().auth.updateUser({ password });
    setBusy(false);
    if (err) {
      setError(
        err.code === "same_password"
          ? "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสเดิม"
          : "เปลี่ยนรหัสผ่านไม่สำเร็จ ลองออกจากระบบแล้วเข้าใหม่ก่อนเปลี่ยน",
      );
      return;
    }
    setPassword("");
    setConfirm("");
    toast.success("เปลี่ยนรหัสผ่านแล้ว ครั้งต่อไปใช้รหัสใหม่");
  }

  return (
    <form onSubmit={submit} autoComplete="off" className="space-y-4 rounded-xl border p-4">
      <h2 className="text-lg font-semibold">เปลี่ยนรหัสผ่าน</h2>
      <div className="space-y-2">
        <Label htmlFor="new-password">รหัสผ่านใหม่</Label>
        <div className="relative">
          <Input
            id="new-password"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            data-lpignore="true"
            data-1p-ignore
            minLength={6}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="อย่างน้อย 6 ตัว"
            className="h-11 pr-11"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
            className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">ยืนยันรหัสผ่านใหม่</Label>
        <Input
          id="confirm-password"
          type={show ? "text" : "password"}
          autoComplete="new-password"
          data-lpignore="true"
          data-1p-ignore
          minLength={6}
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="พิมพ์อีกครั้ง"
          className="h-11"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy} className="h-11 w-full">
        {busy ? "รอสักครู่…" : "เปลี่ยนรหัสผ่าน"}
      </Button>
    </form>
  );
}
