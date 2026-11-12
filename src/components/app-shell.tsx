"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, LogOut, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand";
import { TAB_FLAG } from "@/lib/session-marker";
import { cn } from "@/lib/utils";
import { logout, resetAllSessions } from "@/app/login/actions";

const noSubscribe = () => () => {};
const readTabFlag = () => {
  try {
    return sessionStorage.getItem(TAB_FLAG) === "1";
  } catch {
    return true;
  }
};

const navItems = [
  { href: "/", label: "แผนของฉัน", icon: FileText, match: "/plans", reviewerOnly: false },
  { href: "/review", label: "ตรวจแผน", icon: ClipboardCheck, match: "/review", reviewerOnly: true },
];

export function AppShell({
  children,
  isReviewer,
  email,
}: {
  children: React.ReactNode;
  isReviewer: boolean;
  email: string;
}) {
  const pathname = usePathname();
  // เปิดแท็บหรือหน้าต่างใหม่ (ไม่มีแฟล็กในแท็บนี้) ต้องล็อกอินใหม่ทุกครั้ง
  const tabLive = useSyncExternalStore(noSubscribe, readTabFlag, () => null);
  useEffect(() => {
    if (tabLive === false) void logout();
  }, [tabLive]);
  const items = navItems.filter((item) => !item.reviewerOnly || isReviewer);
  const isActive = (item: (typeof navItems)[number]) =>
    item.href === "/" ? pathname === "/" || pathname.startsWith("/plans") : pathname.startsWith(item.match);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-[#33407A] bg-brand-surface text-brand-surface-foreground print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:gap-6">
          <Link href="/" aria-label={`${brand.name} หน้าแรก`} className="flex shrink-0 items-center">
            <BrandLogo height={30} onDark priority />
          </Link>
          <nav className="flex gap-1" aria-label="เมนูหลัก">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-[#C9CDE0] transition-colors hover:bg-white/10 hover:text-white md:h-10",
                  isActive(item) && "bg-white/15 font-medium text-white",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden max-w-48 truncate text-sm text-[#C9CDE0] lg:inline">{email}</span>
            {isReviewer && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 gap-1.5 px-2 text-sm text-white hover:bg-white/10 hover:text-white md:h-9"
                aria-label="รีเซ็ตเว็บ ให้ทุกคนล็อกอินใหม่"
                title="รีเซ็ตเว็บ: ให้ทุกคนล็อกอินใหม่"
                onClick={async () => {
                  if (!window.confirm("รีเซ็ตเว็บ?\nทุกคนที่ล็อกอินอยู่ (รวมถึงคุณ) จะถูกออกจากระบบทันที และต้องล็อกอินใหม่")) return;
                  const r = await resetAllSessions();
                  if (r?.error) toast.error(r.error);
                }}
              >
                <ShieldAlert className="size-5" />
                <span className="hidden md:inline">รีเซ็ตเว็บ</span>
              </Button>
            )}
            <Link
              href="/security"
              aria-label="ความปลอดภัยของบัญชี"
              title="ความปลอดภัยของบัญชี"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "size-11 text-white hover:bg-white/10 hover:text-white md:size-9")}
            >
              <ShieldCheck className="size-5" />
            </Link>
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon" className="size-11 text-white hover:bg-white/10 hover:text-white md:size-9" aria-label="ออกจากระบบ">
                <LogOut className="size-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-10 print:max-w-none print:p-0">
        {tabLive ? children : <p className="py-10 text-center text-sm text-muted-foreground">กำลังตรวจสอบการเข้าสู่ระบบ…</p>}
      </main>
    </div>
  );
}
