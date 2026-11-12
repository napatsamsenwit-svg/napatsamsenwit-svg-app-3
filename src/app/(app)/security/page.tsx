import { requireUser } from "@/lib/plan";
import { MfaSetup } from "./mfa-setup";
import { PasswordChange } from "./password-change";

export default async function SecurityPage() {
  const { supabase } = await requireUser();
  const { data } = await supabase.auth.mfa.listFactors();
  const verified = data?.totp.find((f) => f.status === "verified");
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ความปลอดภัยของบัญชี</h1>
        <p className="text-sm text-muted-foreground">
          เปิดยืนยันตัวตน 2 ชั้น เพื่อให้ต่อให้คนอื่นรู้รหัสผ่าน ก็เข้าบัญชีคุณไม่ได้ถ้าไม่มีมือถือของคุณ
        </p>
      </div>
      <PasswordChange />
      <MfaSetup factorId={verified?.id ?? null} />
    </div>
  );
}
