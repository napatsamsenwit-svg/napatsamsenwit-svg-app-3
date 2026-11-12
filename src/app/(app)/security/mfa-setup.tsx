"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

type Enrolling = { factorId: string; qr: string; secret: string };

export function MfaSetup({ factorId }: { factorId: string | null }) {
  const router = useRouter();
  const [enrolling, setEnrolling] = useState<Enrolling | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    const supabase = createClient();
    // ล้างอันที่เริ่มตั้งไว้แต่ยังไม่ยืนยัน เพื่อไม่ให้ชนกัน
    const { data: list } = await supabase.auth.mfa.listFactors();
    for (const f of list?.all ?? []) if (f.status === "unverified") await supabase.auth.mfa.unenroll({ factorId: f.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Anna AI" });
    setBusy(false);
    if (error || !data) return void toast.error("เริ่มตั้งค่าไม่สำเร็จ ลองใหม่อีกครั้ง");
    setEnrolling({ factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirm() {
    if (!enrolling) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: enrolling.factorId, code: code.trim() });
    setBusy(false);
    if (error) return void toast.error("รหัสไม่ถูกต้อง ลองใหม่อีกครั้ง");
    toast.success("เปิดยืนยันตัวตน 2 ชั้นแล้ว");
    setEnrolling(null);
    setCode("");
    router.refresh();
  }

  async function disable() {
    if (!factorId || !window.confirm("ปิดยืนยันตัวตน 2 ชั้น?\nบัญชีจะปลอดภัยน้อยลง")) return;
    setBusy(true);
    const { error } = await createClient().auth.mfa.unenroll({ factorId });
    setBusy(false);
    if (error) return void toast.error("ปิดไม่สำเร็จ ลองใหม่อีกครั้ง");
    toast.success("ปิดแล้ว");
    router.refresh();
  }

  if (factorId) {
    return (
      <div className="space-y-4 rounded-xl border p-4">
        <p className="flex items-center gap-2 font-medium text-emerald-600">
          <ShieldCheck className="size-5" />
          เปิดอยู่
        </p>
        <p className="text-sm text-muted-foreground">ทุกครั้งที่เข้าสู่ระบบ ต้องใส่รหัส 6 หลักจากแอปในมือถือ</p>
        <Button variant="outline" onClick={disable} disabled={busy}>
          ปิดยืนยันตัวตน 2 ชั้น
        </Button>
      </div>
    );
  }

  if (!enrolling) {
    return (
      <div className="space-y-4 rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">ตอนนี้ยังไม่เปิด ต้องมีแอปยืนยันตัวตนในมือถือ เช่น Google Authenticator หรือ Microsoft Authenticator</p>
        <Button onClick={start} disabled={busy}>
          {busy ? "รอสักครู่…" : "เริ่มตั้งค่า"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <ol className="list-decimal space-y-1 pl-5 text-sm">
        <li>เปิดแอปยืนยันตัวตนในมือถือ กดเพิ่มบัญชี แล้วสแกนรูปนี้</li>
        <li>ใส่รหัส 6 หลักที่แอปแสดง แล้วกดยืนยัน</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={enrolling.qr} alt="QR code สำหรับตั้งค่าแอปยืนยันตัวตน" className="mx-auto size-48 rounded-lg bg-white p-2" />
      <p className="text-center text-xs break-all text-muted-foreground">สแกนไม่ได้? ใส่รหัสนี้เอง: {enrolling.secret}</p>
      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="123456"
        className="h-12 text-center text-xl tracking-[0.4em]"
      />
      <Button onClick={confirm} disabled={busy || code.trim().length !== 6} className="w-full">
        {busy ? "รอสักครู่…" : "ยืนยัน"}
      </Button>
    </div>
  );
}
