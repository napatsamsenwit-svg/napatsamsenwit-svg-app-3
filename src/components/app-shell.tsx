"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardCheck, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/brand-logo";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";

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
  const items = navItems.filter((item) => !item.reviewerOnly || isReviewer);
  const isActive = (item: (typeof navItems)[number]) =>
    item.href === "/" ? pathname === "/" || pathname.startsWith("/plans") : pathname.startsWith(item.match);

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 md:h-16 md:gap-6">
          <Link href="/" aria-label={`${brand.name} หน้าแรก`} className="flex shrink-0 items-center">
            <BrandLogo height={30} priority />
          </Link>
          <nav className="flex gap-1" aria-label="เมนูหลัก">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item) ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-lg px-3 text-sm text-muted-foreground transition-colors hover:bg-accent md:h-10",
                  isActive(item) && "bg-accent font-medium text-accent-foreground",
                )}
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden max-w-48 truncate text-sm text-muted-foreground lg:inline">{email}</span>
            <ThemeToggle />
            <form action={logout}>
              <Button type="submit" variant="ghost" size="icon" className="size-11 md:size-9" aria-label="ออกจากระบบ">
                <LogOut className="size-5" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 md:pb-10 print:max-w-none print:p-0">
        {children}
      </main>
    </div>
  );
}
