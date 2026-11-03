import Image from "next/image";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

/** โลโก้เต็ม Anna-AI (ตัวหนังสือสีเข้ม จึงวางบนพื้นขาวในโหมดมืด) */
export function BrandLogo({
  height = 32,
  className,
  onDark = false,
  priority = false,
}: {
  height?: number;
  className?: string;
  /** วางบนพื้นเข้มเสมอ (เช่น แผงซ้ายหน้าล็อกอิน) ใส่แผ่นพื้นขาวรองให้อ่านออก */
  onDark?: boolean;
  priority?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center",
        onDark ? "rounded-xl bg-white px-3 py-2" : "dark:rounded-lg dark:bg-white dark:px-2 dark:py-1",
        className,
      )}
    >
      <Image
        src="/logo.png"
        alt={brand.name}
        width={Math.round((height * 1000) / 221)}
        height={height}
        priority={priority}
      />
    </span>
  );
}
