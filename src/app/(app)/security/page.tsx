import { PasswordChange } from "./password-change";

export default function SecurityPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">ความปลอดภัยของบัญชี</h1>
        <p className="text-sm text-muted-foreground">เปลี่ยนรหัสผ่านของบัญชีที่ล็อกอินอยู่ตอนนี้</p>
      </div>
      <PasswordChange />
    </div>
  );
}
